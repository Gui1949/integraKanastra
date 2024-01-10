const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const format = require("date-fns/format");

const fs = require("fs");

let express = require("express");
const app = express();

app.use(express.json());

let total = 0;
let incluidos = 0;
let erros = 0;
let log_erros = [];
let retorno;

let base = "http://192.168.0.162:8380";
let base64String;
let jsonid;
let url_consulta =
  base +
  "/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&mgeSession=" +
  jsonid;

let login_snk = () => {
  let credentials = {
    username: "INTEGRA.EVUP",
    password: "Med@sys22",
  };

  // Log the credentials to the console for debugging purposes
  console.log(credentials);

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
      console.log(data);

      // Find the start and end indices of the jsessionid element in the response body
      let find_jsonid_ini = data.search("<jsessionid>");
      let find_jsonid_fi = data.search("</jsessionid>");

      // Extract the jsessionid value from the response body
      jsonid = data.slice(find_jsonid_ini, find_jsonid_fi);
      jsonid = jsonid.replace("<jsessionid>", "");

      // Send a JSON response to the client with the jsessionid value
    });
};

let integracao = (objeto) => {
  let url_KANASTRA_login = "https://hub-sandbox.kanastra.com.br/oauth/token";

  let options = {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: `{
                "grant_type":"client_credentials",
                "client_id":"67652792",
                "client_secret":"$2y$10$U6KJaIlRZMNQEIJAz1LiG.dyhCmyrvw19D.5SvvgweBX3ZY.kVSo.",
                "scope": "create-repurchases"
            }`,
  };

  // linha.map((unico) => {
  fetch(url_KANASTRA_login, options)
    .then((res) => res.json())
    .then((json) => {
      const body = {
        externalId:
          objeto[0].sub == "SUBSTITUTO" ? objeto[1].numero : objeto[0].numero,
        expectedAmount:
          objeto[0].sub == "SUBSTITUTO"
            ? parseFloat(objeto[0].valor)
            : parseFloat(objeto[1].valor),
        reason: "DISQUALIFICATION",
        description: "string",
        type: "ACQUISITION",
        withReactivation: true,
        newExternalId: [
          objeto[0].sub == "SUBSTITUTO" ? objeto[0].numero : objeto[1].numero,
        ],
        files: [
          {
            url: "https://www.kanastra.com.br/images/default/sample.pdf",
            content: "",
            category: "nfe_pdf",
            name: "exampleFile.pdf",
          },
        ],
      };

      let url_ENVIO = `https://hub-sandbox.kanastra.com.br/api/credit-originators/fidc-medsystems/repurchases`;

      fetch(url_ENVIO, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${json.access_token}`,
        },
        body: JSON.stringify(body),
      })
        .then((response) => {
          console.log(response.status, response.statusText);

          return response.json();
        })
        .then((resp) => {
          console.log(resp);

          if (resp.error) {
            erros++;
            log_erros.push(
              "Substituir:" +
                body.externalId +
                ", Substituto: " +
                body.newExternalId[0] +
                " - Erro: " +
                resp.error
            );
          } else {
            incluidos++;

            let atualizaParceiro = {
              serviceName: "CRUDServiceProvider.saveRecord",
              requestBody: {
                dataSet: {
                  rootEntity: "Financeiro",
                  includePresentationFields: "N",
                  dataRow: {
                    localFields: {
                      AD_FIDIC: {
                        $: "SUB",
                      },
                    },
                    key: {
                      NUFIN: {
                        $:
                          objeto[0].sub == "SUBSTITUIR"
                            ? objeto[0].numero
                            : objeto[1].numero,
                      },
                    },
                  },
                  entity: {
                    fieldset: {
                      list: "NUFIN",
                    },
                  },
                },
              },
            };

            login_snk();

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
                  "Content-Length": atualizaParceiro.length,
                  Cookie: "JSESSIONID=" + jsonid,
                },
                body: JSON.stringify(atualizaParceiro),
              }
            )
              .then((resp) => resp.text())
              .then((resposta) => {
                console.log(resposta);
              });
            //});
          }

          retorno = resp;
        });
    })
    .catch((err) => console.error("error:" + err));
  // });
};

login_snk();

app.get("/monitor/kanastra/devolucao", function (request, response) {
  response.json({
    devolucao: {
      total: total,
      incluidos: incluidos,
      atualizados: 0,
      erros: erros,
      log_erros: log_erros,
    },
  });
});

app.post("/update/fdic", function (req, response) {
  console.log(req.body);

  let { numeros, subs, valor } = req.body;

  const objeto = numeros.map((numero, index) => {
    return {
      numero,
      sub: subs[index],
      valor: valor[index],
    };
  });

  integracao(objeto);

  setTimeout(() => {
    let tratamento = retorno?.error
      ? retorno?.error
      : retorno?.status;

    console.log(retorno);

    response.json({ data: tratamento });
  }, 5000);
});

app.listen(process.env.PORT || 40003);
