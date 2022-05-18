const puppeteer = require('puppeteer'); // v13.0.0 or later
const $ = require("jquery");
const fs = require("fs")


// i = 2
var i = 2;
var dataset = 'datasetcompleto.csv';

// use node --inspect-brk .\prueba.js for debug
// open chrome://inspect/#devices
// use debugger;

async function wait1sec() {
  console.log('start timer');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('after 1 second');
}

(async () => {
    // Headless to true
    const browser = await puppeteer.launch({  
      // para mostrar la ejecución
      //headless: false, 
      //slowMo: 100,
      //devtools: true,
      executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe' });
    const page = await browser.newPage();
    const timeout = 25000;
    page.setDefaultTimeout(timeout);

    async function waitForSelectors(selectors, frame, options) {
      for (const selector of selectors) {
        try {
          return await waitForSelector(selector, frame, options);
        } catch (err) {
          console.error(err);
          return;
        }
      }
      //throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
    }

    async function scrollIntoViewIfNeeded(element, timeout) {
      await waitForConnected(element, timeout);
      const isInViewport = await element.isIntersectingViewport({threshold: 0});
      if (isInViewport) {
        return;
      }
      await element.evaluate(element => {
        element.scrollIntoView({
          block: 'center',
          inline: 'center',
          behavior: 'auto',
        });
      });
      await waitForInViewport(element, timeout);
    }

    async function waitForConnected(element, timeout) {
      await waitForFunction(async () => {
        try{
          return await element.getProperty('isConnected');
        } catch(e){
          console.log(e)
        }
        return;
      }, timeout);
    }

    async function waitForInViewport(element, timeout) {
      await waitForFunction(async () => {
        try{
          return await element.isIntersectingViewport({threshold: 0});
        } catch(e){
          console.log(e)
        }
        return;
      }, timeout);
    }

    async function waitForSelector(selector, frame, options) {
      try{
        if (!Array.isArray(selector)) {
          selector = [selector];
        }
        if (!selector.length) {
          //throw new Error('Empty selector provided to waitForSelector');
        }
        let element = null;
        for (let i = 0; i < selector.length; i++) {
          const part = selector[i];
          if (element) {
            element = await element.waitForSelector(part, options);
          } else {
            element = await frame.waitForSelector(part, options);
          }
          if (!element) {
            //throw new Error('Could not find element: ' + selector.join('>>'));
          }
          if (i < selector.length - 1) {
            element = (await element.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
          }
        }
        if (!element) {
          //throw new Error('Could not find element: ' + selector.join('|'));
        }
        return element;
      } catch(e){
        console.log(e)
      }
      return ;
    }

    async function waitForElement(step, frame, timeout) {
      const count = step.count || 1;
      const operator = step.operator || '>=';
      const comp = {
        '==': (a, b) => a === b,
        '>=': (a, b) => a >= b,
        '<=': (a, b) => a <= b,
      };
      const compFn = comp[operator];
      await waitForFunction(async () => {
        const elements = await querySelectorsAll(step.selectors, frame);
        return compFn(elements.length, count);
      }, timeout);
    }

    async function querySelectorsAll(selectors, frame) {
      for (const selector of selectors) {
        const result = await querySelectorAll(selector, frame);
        if (result.length) {
          return result;
        }
      }
      return [];
    }

    async function querySelectorAll(selector, frame) {
      if (!Array.isArray(selector)) {
        selector = [selector];
      }
      if (!selector.length) {
        //throw new Error('Empty selector provided to querySelectorAll');
      }
      let elements = [];
      for (let i = 0; i < selector.length; i++) {
        const part = selector[i];
        if (i === 0) {
          elements = await frame.$$(part);
        } else {
          const tmpElements = elements;
          elements = [];
          for (const el of tmpElements) {
            elements.push(...(await el.$$(part)));
          }
        }
        if (elements.length === 0) {
          return [];
        }
        if (i < selector.length - 1) {
          const tmpElements = [];
          for (const el of elements) {
            const newEl = (await el.evaluateHandle(el => el.shadowRoot ? el.shadowRoot : el)).asElement();
            if (newEl) {
              tmpElements.push(newEl);
            }
          }
          elements = tmpElements;
        }
      }
      return elements;
    }

    async function waitForFunction(fn, timeout) {
      let isActive = true;
      setTimeout(() => {
        isActive = false;
      }, timeout);
      while (isActive) {
        const result = await fn();
        if (result) {
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      //throw new Error('Timed out');
    }

    {
        const targetPage = page;
        //await targetPage.setViewport({"width":991,"height":721})
        await targetPage.setUserAgent( 'UA-TEST' );
    }
    /*{
        const targetPage = page;
        const promises = [];
        promises.push(targetPage.waitForNavigation());
        await targetPage.goto('https://ceice.gva.es/es/web/centros-docentes/consulta-general');
        await Promise.all(promises);
    }
    {
        const targetPage = page;
        let frame = targetPage.mainFrame();
        frame = frame.childFrames()[0];
        const element = await waitForSelectors([["aria/Buscar"],["#aceptar"]], frame, { timeout, visible: true });
        await scrollIntoViewIfNeeded(element, timeout);
        await element.click({ offset: { x: 22.375, y: 7} });
    }*/

    const promises = [];
    var rows = [];
    //var totalHighschools = 3716;
    var end = false;

    rows.push(["\"Código\",\"Nombre\",\"Régimen\",\"Dirección\",\"Localidad\",\"Teléfono\",\"Fax\",\"Latitud\",\"Longitud\",\"Titularidad\",\"CIF\",\"Comarca\",\"Email\",\"Web\",\"Servicios complementarios\""])

    while (!end){
      var row = [];
      
      try {
        const targetPage = page; 
        promises.push(targetPage.waitForNavigation());
        await targetPage.goto('https://ceice.gva.es/es/web/centros-docentes/consulta-general');
        await Promise.all(promises);
      } catch(e){
        console.log(e)
      }


      try {
          const targetPage = page;
          let frame = targetPage.mainFrame();
          frame = frame.childFrames()[0];
          const element = await waitForSelectors([["aria/Buscar"],["#aceptar"]], frame, { timeout, visible: true });
          await scrollIntoViewIfNeeded(element, timeout);
          await element.click();
      } catch(e){
        console.log(e)
      }
      
      try {
        //wait1sec();
        const targetPage = page;
        let frame = targetPage.mainFrame();
        frame = frame.childFrames()[0];

        var selector = "body > table > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child("+i+") > td:nth-child(1) > a";
        const element = await waitForSelectors([[selector]], frame, { timeout, visible: true });
        //await scrollIntoViewIfNeeded(element, timeout);
        //await element.click();
        await element.evaluate(element => element.click());
        //await Promise.all(promises);
      } catch(e){
        end = true;
        console.log(e)
      }

      if(!end){
        try {
          const targetPage = page;
          let frame = targetPage.mainFrame();
          frame = frame.childFrames()[0];
          const element = await waitForSelectors([["#contenidoInferior > div.nivelCentro > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(1) > div > span"]], frame, { timeout, visible: true });

          //debugger;

          var codigoText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(1) > div > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("Código: " + codigoText);
          row.push("\"" + codigoText + "\"");

          var nombreText = await frame.evaluate(() => {
            var nombre = "";
            try{
              nombre = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(1) > div > span").innerText;
            } catch(e){

            }
            return nombre;
          });
          //console.log("\nNombre: " + nombreText);
          row.push("\"" + nombreText.replace(/(\r\n|\n|\r)/gm, " ") + "\"");
          
          var regimenText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > div > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("Régimen: " + regimenText);
          row.push("\"" + regimenText + "\"");
          
          var direccionText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(1) > td:nth-child(3) > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("Dirección: " + direccionText);
          row.push("\"" + direccionText + "\"");
          
          var localidadText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(5) > td:nth-child(2) > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("localidad: " + localidadText);
          row.push("\"" + localidadText + "\"");
          
          var telefonoText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(2) > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("Telefono: " + telefonoText);
          row.push("\"" + telefonoText + "\"");
          
          var faxText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(3) > td:nth-child(2) > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("Fax: " + faxText);
          row.push("\"" + faxText + "\"");
          
          var latText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(7) > td:nth-child(3) > div > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("lat: " + latText);
          row.push("\"" + latText + "\"");
          
          var longText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(7) > td:nth-child(4) > div > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("long: " + longText);
          row.push("\"" + longText + "\"");
          
          var titularText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(7) > td.Estilo2").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("titular: " + titularText);
          row.push("\"" + titularText + "\"");
          
          var cifText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(1) > tbody > tr:nth-child(3) > td > div > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("CIF: " + cifText);
          row.push("\"" + cifText + "\"");
          
          var comarcaText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(6) > td:nth-child(2) > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("comarca: " + comarcaText);
          row.push("\"" + comarcaText + "\"");
          
          var emailText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(3) > tbody > tr:nth-child(4) > td:nth-child(2) > span").innerText;
            } catch(e){

            }
            return text;
          });
          //console.log("email: " + emailText);
          row.push("\"" + emailText + "\"");
          
          var webText = await frame.evaluate(() => {
            var text = "";
            try{
              text = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(1) > tbody > tr:nth-child(1) > td:nth-child(2) > div > a:nth-child(7)").href;
            } catch(e){

            }
            return text;
          });
          //console.log("web: " + webText);
          row.push("\"" + webText + "\"");


          var totalServicios = await frame.evaluate(() => {
            var div = "";
            try{
              div = document.querySelector("#contenidoInferior > div.nivelCentro > table:nth-child(2) > tbody > tr > td > div");
            } catch(e){

            }
            return div.children.length;
          });
          //console.log("Total servicios: " + totalServicios);

          var otros = "";
          for(var j = 1; j <= totalServicios; j++){
              var otrosServiciosText = await frame.evaluate((j) => {
                var otroServicio = "";
                try{
                  var selector = "#contenidoInferior > div.nivelCentro > table:nth-child(2) > tbody > tr > td > div > img:nth-child(" + j + ")"
                  otroServicio = document.querySelector(selector).title;
                } catch(e){

                }

                return otroServicio;
              }, j);
              //console.log("Otros servicios: " + otrosServiciosText);
              if(j == totalServicios){
                otros += otrosServiciosText;
              } else {
                otros += otrosServiciosText + "; ";
              }
          }
          row.push("\"" + otros + "\"");

          fs.appendFileSync(dataset, row.join(',')+ '\n');

          rows.push(row);

          console.log(i);
          i++;

          //element.click();
        } catch(e){
          console.log(e)
        }
      }
    }

    // Create CSV file
    //console.log(JSON.stringify(rows));
    /*let writeStream = fs.createWriteStream(dataset)
    rows.forEach((someObject, index) => {

        writeStream.write(someObject.join(',')+ '\n', () => {
            // a line was written to stream
        })
    });
    writeStream.end()
    writeStream.on('finish', () => {
        console.log('finish write stream, moving along')
    }).on('error', (err) => {
        console.log(err)
    })*/

    await browser.close();
})();
