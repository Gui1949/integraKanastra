const fs = require("fs");
const ftp = require("basic-ftp");
const pdf2pic = require("pdf2pic");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

let total = 0;
let incluidos = 0;
let erros = 0;
let log_erros = [];

let express = require("express");
const app = express();

app.use(express.json());

async function downloadFiles() {
  // const client = new ftp.Client();

  try {
    const localDirectory = "./downloaded_files";
    // Create the local directory if it doesn't exist
    if (!fs.existsSync(localDirectory)) {
      fs.mkdirSync(localDirectory);
    }

    console.log("aqui", localDirectory);
    
    fs.readdirSync(localDirectory).map((file) => {
      console.log("aqui", file);

      const base64Pdf = fs.readFileSync(`./downloaded_files/${file}`, {
        encoding: "base64",
      });

      const login_snk = () => {
        let credentials = {
          username: "INTEGRA.EVUP",
          password: "Med@sys22",
        };

        const base = "http://10.10.10.6:8180";

        // Define the URL for the login service
        const url = base + "/mge/service.sbr?serviceName=MobileLoginSP.login";

        // Construct the request body in the format required by the service
        let content =
          '<serviceRequest serviceName="MobileLoginSP.login"><requestBody><NOMUSU>' +
          credentials.username +
          "</NOMUSU><INTERNO>" +
          credentials.password +
          "</INTERNO></requestBody></serviceRequest>";

        // Send a POST request to the service with the appropriate headers and request body
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            Accept: "*/*",
            "Accept-Language": "en-GB",
            "Accept-Encoding": "gzip, deflate",
            Connection: "Keep-alive",
            "Content-Length": content.length,
          },
          body: content,
        })
          .then((resp) => resp.text()) // Extract the response body as text
          .then(function (data) {
            // Log the response data for debugging purposes

            // Find the start and end indices of the jsessionid element in the response body
            let find_jsonid_ini = data.search("<jsessionid>");
            let find_jsonid_fi = data.search("</jsessionid>");

            // Extract the jsessionid value from the response body
            jsonid = data.slice(find_jsonid_ini, find_jsonid_fi);
            jsonid = jsonid.replace("<jsessionid>", "");

            let criaRegistro = {
              serviceName: "CRUDServiceProvider.saveRecord",
              requestBody: {
                dataSet: {
                  rootEntity: "AD_CANHOTOFTP",
                  includePresentationFields: "N",
                  dataRow: {
                    localFields: {
                      CONTEUDO: {
                        $: base64Pdf,
                      },
                      CHAVENFE: {
                        $: file
                          .replaceAll(".pdf", "")
                          .replaceAll(" ", "")
                          .replaceAll(".png", "")
                          .replaceAll(".jpg", "")
                          .replaceAll(".jpeg", ""),
                      },
                    },
                  },
                  entity: {
                    fieldset: {
                      list: "ID",
                    },
                  },
                },
              },
            };

            fetch(
              base +
                "/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json",
              {
                method: "POST",
                headers: {
                  "Content-Type": "text/xml; charset=utf-8",
                  Accept: "*/*",
                  "Accept-Language": "en-GB",
                  "Accept-Encoding": "gzip, deflate",
                  Connection: "Keep-alive",
                  Cookie: "JSESSIONID=" + jsonid,
                },
                body: JSON.stringify(criaRegistro),
              }
            )
              .then((resp) => resp.text())
              .then((resposta) => {
                console.log(resposta);

                if (resposta.tsError) {
                  log_erros.push(
                    "Nº Financeiro: " +
                      +file.name.replace(".pdf", "") +
                      " - " +
                      resposta.statusMessage
                  );
                  erros++;
                }

                incluidos++;

                fs.unlinkSync(`./downloaded_files/${file}`);
              });

            // Send a JSON response to the client with the jsessionid value
          });
      };

      login_snk();
    });
  } catch (err) {
    console.error(err);
    log_erros.push(err);
  }
}

downloadFiles();

app.get("/monitor/kanastra/envia_canhoto", function (request, response) {
  response.json({
    envia_canhoto: {
      total: incluidos + erros,
      incluidos: incluidos,
      atualizados: 0,
      erros: erros,
      log_erros: log_erros,
    },
  });
});

app.listen(process.env.PORT || 40005);
