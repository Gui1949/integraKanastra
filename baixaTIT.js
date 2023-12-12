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

let base = "http://msp-ironman:8380";
let base64String;

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

      integracao(jsonid);

      // Send a JSON response to the client with the jsessionid value
    });
};

let integracao = (jsonid) => {
  let url_consulta =
    base +
    "/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&mgeSession=" +
    jsonid;

  fetch(url_consulta, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Cookie: "JSESSIONID=" + jsonid,
    },
    body: JSON.stringify({
      serviceName: "DbExplorerSP.executeQuery",
      requestBody: {
        sql: `
        SELECT 
        FIN.NUFIN AS 'externalId',
        
        --payment
        
        VLRBAIXA AS 'amount',
        FORMAT(DHBAIXA,'yyyyMMdd') AS 'date',
        'BOLETO' as 'method',
        CONCAT(LTRIM(RTRIM(TIT.DESCRTIPTIT)), ' ', FIN.NUFIN) as 'reference',
        NULL AS 'authentication',
        
        --payer
        
        PAR.CGC_CPF as 'governmentId',
        PAR.RAZAOSOCIAL as 'name',
        PAI.DESCRICAO as 'country'
        
        
        
        FROM TGFFIN FIN
        INNER JOIN TGFTIT TIT ON TIT.CODTIPTIT = FIN.CODTIPTIT
        INNER JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
        LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
        LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
        LEFT JOIN TSIPAI PAI ON PAI.CODPAIS = UFS.CODPAIS
        WHERE 
        AD_FIDIC = 'I' AND
        DHBAIXA IS NOT NULL        
        `,
      },
    }),
  })
    .then((resp) => resp.text())
    .then(function (datares) {
      let linha = "";
      try {
        datares = JSON.parse(datares);
        linha = datares.responseBody.rows;

        total = linha.length;

        let url_KANASTRA_login =
          "https://hub-sandbox.kanastra.com.br/oauth/token";

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
                "scope": "create-offers create-liquidations"
            }`,
        };

        fetch(url_KANASTRA_login, options)
          .then((res) => res.json())
          .then((json) => {
            linha.map((unico) => {
              let json_envio = {
                externalId: unico[0].toString(),
                payment: {
                  amount: unico[1],
                  date: unico[2],
                  method: unico[3],
                  reference: unico[4],
                  authentication: unico[5],
                },
                payer: {
                  governmentId: unico[6],
                  name: unico[7],
                  country: unico[8],
                },
                customFields: {},
                files: [
                  {
                    content:
                      "JVBERi0xLjQNJeLjz9MNCjYgMCBvYmoNPDwvTGluZWFyaXplZCAxL0wgMTA1MjcvTyA4L0UgNjM5MC9OIDEvVCAxMDM2Ni9IIFsgNTU2IDE2MF0+Pg1lbmRvYmoNICAgICAgICAgICAgICAgICAgICAgIA14cmVmDTYgMTMNMDAwMDAwMDAxNiAwMDAwMCBuDQowMDAwMDAwNzE2IDAwMDAwIG4NCjAwMDAwMDA3OTMgMDAwMDAgbg0KMDAwMDAwMDk4MyAwMDAwMCBuDQowMDAwMDAxMTAzIDAwMDAwIG4NCjAwMDAwMDE0NjUgMDAwMDAgbg0KMDAwMDAwMTUwMCAwMDAwMCBuDQowMDAwMDAyMDExIDAwMDAwIG4NCjAwMDAwMDQ3MDMgMDAwMDAgbg0KMDAwMDAwNTk5MiAwMDAwMCBuDQowMDAwMDA2MjM3IDAwMDAwIG4NCjAwMDAwMDYzMTQgMDAwMDAgbg0KMDAwMDAwMDU1NiAwMDAwMCBuDQp0cmFpbGVyDTw8L1NpemUgMTkvUHJldiAxMDM1OC9Sb290IDcgMCBSL0luZm8gNSAwIFIvSURbPDJBNUYyNDY1QTAzOEU4MTNGNENCODJCRkUyNjVCMjlDPjw5MEJDMTM1M0JCNEI0RURGQTZCNEEzQ0ZFQUI0NkY0RT5dPj4Nc3RhcnR4cmVmDTANJSVFT0YNICAgICAgICAgICAgICAgICAgICAgICAgDTE4IDAgb2JqDTw8L0xlbmd0aCA3Ny9GaWx0ZXIvRmxhdGVEZWNvZGUvSSA5NS9MIDc5L1MgMzg+PnN0cmVhbQ0KeNpiYGDgYmBgqmQAAtG7DKiACYhZGDgakMW4oJiBQZmBh3NDqEgBg+ypRL+ES0wLNMHCjAwMEmFQzc5AzMrAoM4NEWc4DRBgALNcCSUNZW5kc3RyZWFtDWVuZG9iag03IDAgb2JqDTw8L01ldGFkYXRhIDQgMCBSL1BhZ2VzIDMgMCBSL1R5cGUvQ2F0YWxvZy9QYWdlTGFiZWxzIDEgMCBSPj4NZW5kb2JqDTggMCBvYmoNPDwvQ3JvcEJveFswIDAgNjEyIDc5Ml0vUGFyZW50IDMgMCBSL0NvbnRlbnRzIDEyIDAgUi9Sb3RhdGUgMC9CbGVlZEJveFsyMi40MDkgNDAgNTg5LjU5MSA3NzRdL01lZGlh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MC4wMj4+DWVuZG9iag0xNyAwIG9iag08PC9PUE0gMS9PUCBmYWxzZS9vcCBmYWxzZS9UeXBlL0V4dEdTdGF0ZS9TQSB0cnVlL1NNIDAuMDI+Pg1lbmRvYmoNMSAwIG9iag08PC9OdW1zWzAgMiAwIFJdPj4NZW5kb2JqDTIgMCBvYmoNPDwvUChQYWdlICkvUy9EPj4NZW5kb2JqDTMgMCBvYmoNPDwvQ291bnQgMS9UeXBlL1BhZ2VzL0tpZHNbOCAwIFJdPj4NZW5kb2JqDTQgMCBvYmoNPDwvU3VidHlwZS9YTUwvTGVuZ3RoIDM1NzEvVHlwZS9NZXRhZGF0YT4+c3RyZWFtDQo8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA0LjAtYzMxNiA0NC4yNTM5MjEsIFN1biBPY3QgMDEgMjAwNiAxNzowODoyMyI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CiAgICAgICAgIDxkYzpmb3JtYXQ+YXBwbGljYXRpb24vcGRmPC9kYzpmb3JtYXQ+CiAgICAgICAgIDxkYzp0aXRsZT4KICAgICAgICAgICAgPHJkZjpBbHQ+CiAgICAgICAgICAgICAgIDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+cGRmX2phbmVsYTwvcmRmOmxpPgogICAgICAgICAgICA8L3JkZjpBbHQ+CiAgICAgICAgIDwvZGM6dGl0bGU+CiAgICAgICAgIDxkYzpjcmVhdG9yPgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaT5NYXVybyBNYW5nYXM8L3JkZjpsaT4KICAgICAgICAgICAgPC9yZGY6U2VxPgogICAgICAgICA8L2RjOmNyZWF0b3I+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4YXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eGFwOkNyZWF0ZURhdGU+MjAwOS0wMS0yMVQxNDo1ODowOFo8L3hhcDpDcmVhdGVEYXRlPgogICAgICAgICA8eGFwOk1vZGlmeURhdGU+MjAwOS0wMS0yMVQxNDo1ODowOFo8L3hhcDpNb2RpZnlEYXRlPgogICAgICAgICA8eGFwOkNyZWF0b3JUb29sPkFkb2JlIElsbHVzdHJhdG9yKFIpIDEzLjA8L3hhcDpDcmVhdG9yVG9vbD4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOnBkZj0iaHR0cDovL25zLmFkb2JlLmNvbS9wZGYvMS4zLyI+CiAgICAgICAgIDxwZGY6UHJvZHVjZXI+QWNyb2JhdCBEaXN0aWxsZXIgOC4xLjAgKE1hY2ludG9zaCk8L3BkZjpQcm9kdWNlcj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOnhhcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIj4KICAgICAgICAgPHhhcE1NOkRvY3VtZW50SUQ+dXVpZDo4ZDI3Zjk2MS1hMWFmLTZmNGEtOWIyOS1hODkwOGM0MDkzZWE8L3hhcE1NOkRvY3VtZW50SUQ+CiAgICAgICAgIDx4YXBNTTpJbnN0YW5jZUlEPnV1aWQ6OTBhMGUyYTEtZGIwZS1jYzQxLTk2MTctMWJlYWJkOGVlMmI5PC94YXBNTTpJbnN0YW5jZUlEPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+DWVuZHN0cmVhbQ1lbmRvYmoNNSAwIG9iag08PC9DcmVhdGlvbkRhdGUoRDoyMDA5MDEyMTE0NTgwOFopL0F1dGhvcihNYXVybyBNYW5nYXMpL0NyZWF0b3IoQWRvYmUgSWxsdXN0cmF0b3JcKFJcKSAxMy4wKS9Qcm9kdWNlcihBY3JvYmF0IERpc3RpbGxlciA4LjEuMCBcKE1hY2ludG9zaFwpKS9Nb2REYXRlKEQ6MjAwOTAxMjExNDU4MDhaKS9UaXRsZShwZGZfamFuZWxhKT4+DWVuZG9iag14cmVmDTAgNg0wMDAwMDAwMDAwIDY1NTM1IGYNCjAwMDAwMDYzOTAgMDAwMDAgbg0KMDAwMDAwNjQyNCAwMDAwMCBuDQowMDAwMDA2NDU3IDAwMDAwIG4NCjAwMDAwMDY1MDggMDAwMDAgbg0KMDAwMDAxMDE1NSAwMDAwMCBuDQp0cmFpbGVyDTw8L1NpemUgNj4+DXN0YXJ0eHJlZg0xMTYNJSVFT0YN",
                    category: "proof_of_payment",
                    name: "proof_of_payment_ABCD1234.pdf",
                  },
                ],
                settlementType: "TOTAL",
              };

              let token = json.access_token;

              let url =
                "https://hub-sandbox.kanastra.com.br/api/credit-originators/fidc-medsystem/liquidations";

              let options = {
                method: "POST",

                headers: {
                  "Content-Type": "application/json",
                  "User-Agent": "insomnia/8.4.5",
                  Authorization: "Bearer " + token,
                },

                body: JSON.stringify(json_envio),
              };

              // const str = JSON.stringify(body);
              // const filename = "input.txt";

              // fs.open(filename, "a", (err, fd) => {
              //   if (err) {
              //     console.log(err.message);
              //   } else {
              //     fs.write(fd, str, (err, bytes) => {
              //       if (err) {
              //         console.log(err.message);
              //       } else {
              //         console.log(bytes + " bytes written");
              //       }
              //     });
              //   }
              // });

              fetch(url, options)
                .then((res) => res.json())
                .then((json) => {
                  console.log(json);

                  if (json.error) {
                    log_erros.push(json.error);
                    erros++;
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
                                $: "B",
                              },
                            },
                            key: {
                              NUFIN: {
                                $: unico[0],
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
                  }
                })
                .catch((err) => console.error("error:" + err));
            });

            //   .catch((err) => console.error("error:" + err));
          });
        // };
      } catch {
        linha = undefined;
      }
    });
};

login_snk();

app.get("/monitor/kanastra/baixa", function (request, response) {
  response.json({
    baixa: {
      total: total,
      incluidos: incluidos,
      atualizados: 0,
      erros: erros,
      log_erros: log_erros,
    },
  });
});

app.listen(process.env.PORT || 40002);
