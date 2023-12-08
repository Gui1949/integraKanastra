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

      filtrar_dados();

      // Send a JSON response to the client with the jsessionid value
    });
};

let filtrar_dados = () => {
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
        SELECT DISTINCT REN.NURENEG FROM TGFREN REN
        INNER JOIN TGFFIN FIN ON FIN.NUFIN = REN.NUFIN
        WHERE FIN.AD_FIDIC = 'Y'
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

        linha.map((li) => {
          integracao(li[0]);
        });
      } catch {}
    });
};

let integracao = (nureneg) => {
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
  LTRIM(RTRIM(PAR.RAZAOSOCIAL)) AS 'sponsorName', 
  LTRIM(RTRIM(CGC_CPF)) as 'sponsorGovernmentId',
  LTRIM(RTRIM(TIPPESSOA)) as 'sponsorPersonType',  
  LTRIM(RTRIM(UPPER(CONCAT(ENDE.TIPO, ' ', ENDE.NOMEEND)))) AS 'sponsorAddress',
  LTRIM(RTRIM(PAR.NUMEND)) as 'sponsorAddressNumber', 
  LTRIM(RTRIM(BAI.NOMEBAI)) as 'sponsorNeighborhood', 
  LTRIM(RTRIM(CID.NOMECID)) as 'sponsorCity', 
  LTRIM(RTRIM(UFS.UF)) as 'sponsorState',
  LTRIM(RTRIM(PAI.DESCRICAO)) as 'sponsorCountry',
  LTRIM(RTRIM(PAR.CEP)) as 'sponsorZipCode', 
  LTRIM(RTRIM(EMP.RAZAOSOCIAL)) as 'sellerName',
  LTRIM(RTRIM(EMP.CGC)) as 'sellerGovernmentId', 
  'LEGAL_PERSON' AS 'sellerPersonType', 
  LTRIM(RTRIM(UPPER(CONCAT(ENDE_EMP.TIPO, ' ', ENDE_EMP.NOMEEND)))) AS 'sellerAddress',
  LTRIM(RTRIM(EMP.NUMEND)) as 'sellerAddressNumber',
  LTRIM(RTRIM(BAI_EMP.NOMEBAI)) as 'sellerNeighborhood',
  LTRIM(RTRIM(CID_EMP.NOMECID)) as 'sellerCity',
  LTRIM(RTRIM(UFS_EMP.UF)) as 'sellerState',
  LTRIM(RTRIM(PAI_EMP.DESCRICAO)) as 'sellerCountry', 
  LTRIM(RTRIM(EMP.CEP)) as 'sellerZipCode',
  FIN.PARCRENEG as 'assetType',
  FIN.NUMNOTA as 'invoiceNumber',
  FIN.DTNEG as 'invoiceDate',
  (SELECT CHAVENFE FROM TGFCAB WHERE NUNOTA = (SELECT NUNOTA FROM TGFFIN WHERE NUFIN = (SELECT NUFIN FROM TGFREN
  WHERE 
  NURENEG = ${nureneg}))) AS 'invoiceKey',
  (SELECT COUNT(*) FROM TGFFIN WHERE NURENEG = ${nureneg} AND PARCRENEG IS NOT NULL AND RECDESP = 1) AS 'totalInstallments',
  FIN.VLRDESDOB AS 'paymentValue',
  FIN.DTNEG AS 'paymentDate',
  FIN.NUFIN,
  (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NURENEG = ${nureneg} AND PARCRENEG IS NOT NULL AND RECDESP = 1) AS 'valorTotal',
  (SELECT NUNOTA FROM TGFCAB WHERE NUNOTA = (SELECT NUNOTA FROM TGFFIN WHERE NUFIN = (SELECT NUFIN FROM TGFREN
    WHERE 
    NURENEG = ${nureneg}))) AS 'NUNOTA'
  
  FROM TGFFIN FIN
  LEFT JOIN TGFPAR PAR ON PAR.CODPARC = FIN.CODPARC
  LEFT JOIN TSIEND ENDE ON ENDE.CODEND = PAR.CODEND
  LEFT JOIN TSIBAI BAI ON BAI.CODBAI = PAR.CODBAI
  LEFT JOIN TSICID CID ON CID.CODCID = PAR.CODCID
  LEFT JOIN TSIUFS UFS ON UFS.CODUF = CID.UF
  LEFT JOIN TSIPAI PAI ON PAI.CODPAIS = UFS.CODPAIS
  LEFT JOIN TSIEMP EMP ON EMP.CODEMP = FIN.CODEMP
  
  LEFT JOIN TSIEND ENDE_EMP ON ENDE_EMP.CODEND = EMP.CODEND
  LEFT JOIN TSIBAI BAI_EMP ON BAI_EMP.CODBAI = EMP.CODBAI
  LEFT JOIN TSICID CID_EMP ON CID_EMP.CODCID = EMP.CODCID
  LEFT JOIN TSIUFS UFS_EMP ON UFS_EMP.CODUF = CID_EMP.UF
  LEFT JOIN TSIPAI PAI_EMP ON PAI_EMP.CODPAIS = UFS_EMP.CODPAIS
  
  WHERE 
  NURENEG = ${nureneg} AND PARCRENEG IS NOT NULL AND RECDESP = 1
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

        // console.log(linha);

        let itens = [];

        let numrfe = 192;

        let url_relat =
          base +
          "/mge/service.sbr?serviceName=VisualizadorRelatorios.visualizarRelatorio&outputType=json&mgeSession=" +
          jsonid;

        fetch(url_relat, {
          method: "POST",
          headers: {
            "Content-Type": "text/JSON; charset=utf-8",
            Cookie: "JSESSIONID=" + jsonid,
            Accept: "*/*",
            "Accept-Language": "en-GB",
            "Accept-Encoding": "gzip, deflate",
            Connection: "Keep-alive",
          },
          body:
            '{"serviceName":"VisualizadorRelatorios.visualizarRelatorio","requestBody":{"relatorio":{"nuRfe":"' +
            numrfe +
            '","parametros":{"parametro":[{"classe":"java.math.BigDecimal","descricao":"NUNOTA","nome":"NUNOTA","pesquisa":"false","requerido":"true","valor":"' +
            linha[0][29] +
            '"}]},"parametrosPK":{"parametro":[]}}}}',
        })
          .then((resp) => resp.text())
          .then(function (datares) {
            console.log(datares);
            let data = JSON.parse(datares);
            let chave;
            try {
              chave = data.responseBody.chave.valor;
              getNota(jsonid, chave);
            } catch (err) {
              console.log(err);
            }
          });

        let getNota = (jsonid, chave) => {
          let i = 0;

          console.log(chave, jsonid);
          fetch(
            base +
              `/mge/visualizadorArquivos.mge?download=S&chaveArquivo=${chave}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: `JSESSIONID=${jsonid}`,
              },
            }
          )
            .then(function (resp) {
              return resp.blob();
            })
            .then(async function (blob) {
              let buffer = await blob.arrayBuffer();
              buffer = Buffer.from(buffer);
              base64String = btoa(
                String.fromCharCode(...new Uint8Array(buffer))
              );
              rodar_loop(base64String);
            });
        };

        let rodar_loop = (base64String) => {
          linha.map((unico, index) => {
            let date = unico[22];
            const year = date.slice(4, 8);
            const mouth = 12;
            const day = 08;

            const dateFormated = new Date(`${year}-${mouth}-${day}`);

            itens.push({
              externalId: unico[27].toString(),
              amount: unico[25],
              dueDate: format(dateFormated, "yyyyMMdd"),
              customFields: {
                preCalculatedAcquisitionPrice: unico[25] * 0.98,
              },
            });
          });

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
                "scope": "create-offers"
            }`,
          };

          let date = linha[0][22];
          const year = date.slice(4, 8);
          const mouth = date.slice(2, 4);
          const day = date.slice(0, 2);

          const dateFormated = new Date(`${year}-${mouth}-${day}`);

          fetch(url_KANASTRA_login, options)
            .then((res) => res.json())
            .then((json) => {
              const body = {
                "externalId": "myOwnId123",
                "sponsorName": "Offer Sponsor",
                "sponsorPersonType": "LEGAL_PERSON",
                "sponsorGovernmentId": "19369866000100",
                "sponsorExternalCode": "myOwnSponsorExternalCode",
                "sponsorAddress": "ROD. SP 080 KM 69",
                "sponsorAddressNumber": "N/A",
                "sponsorAddressComplement": "Fazenda da roça",
                "sponsorNeighborhood": "Zona Rural",
                "sponsorCity": "São Paulo",
                "sponsorState": "SP",
                "sponsorCountry": "Brasil",
                "sponsorZipCode": "26380-000",
                "sponsorBank": "341",
                "sponsorAgency": "1234",
                "sponsorAgencyDigit": "0",
                "sponsorAccount": "98765",
                "sponsorAccountDigit": "0",
                "sponsorPixKey": "12345678901",
                "sellerName": "Offer Seller",
                "sellerPersonType": "LEGAL_PERSON",
                "sellerGovernmentId": "78659066000185",
                "sellerExternalCode": "myOwnSellerExternalCode123",
                "sellerAddress": "Av. Vinhedos",
                "sellerAddressNumber": "71",
                "sellerAddressComplement": "Torre Sul",
                "sellerNeighborhood": "Jardim das Acacias",
                "sellerCity": "Uberlandia",
                "sellerState": "MG",
                "sellerCountry": "Brasil",
                "sellerZipCode": "26380-000",
                "sellerBank": "341",
                "sellerAgency": "1234",
                "sellerAgencyDigit": "0",
                "sellerAccount": "98765",
                "sellerAccountDigit": "0",
                "coobrigation": false,
                "customFields": {},
                "items": [
                  {
                    "assetType": "DUPLICATA_MERCANTIL",
                    "invoiceNumber": "000012",
                    "invoiceDate": "20220101",
                    "invoiceKey": "128391284917238917209381284190",
                    "totalInstallments": 1,
                    "paymentValue": 2000,
                    "paymentDate": "20301231",
                    "customFields": {},
                    "files": [
                      {
                        "url": "https://www.kanastra.com.br/images/default/sample.pdf",
                        "content": "",
                        "category": "nfe_pdf",
                        "name": "exampleCoverageFile.pdf"
                      }
                    ],
                    "installments": [
                      {
                        "externalId": "externalId_01",
                        "amount": 2000,
                        "dueDate": "20301231",
                        "customFields": {}
                      }
                    ]
                  }
                ]
              }

              const offerId = "myOwnOfferId123";

              let url_ENVIO =
                `https://hub-sandbox.kanastra.com.br/api/credit-originators/fidc-medsystem/offers/${offerId}`;

              fetch(url_ENVIO, {
                method: "PUT",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${json.access_token}`,
                },
                body: JSON.stringify(body),
              })
                .then((response) => {
                  //return console.log(JSON.stringify(body));

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

                  console.log(response.status, response.statusText);

                  return response.json();
                })
                .then((resp) => {
                  console.log(resp);

                  try {
                    erros++;
                    log_erros.push(resp.error);
                  } catch {
                    incluidos++;

                    linha.map((unitario) => {
                      let atualizaParceiro = {
                        serviceName: "CRUDServiceProvider.saveRecord",
                        requestBody: {
                          dataSet: {
                            rootEntity: "Financeiro",
                            includePresentationFields: "N",
                            dataRow: {
                              localFields: {
                                AD_FIDIC: {
                                  $: "I",
                                },
                              },
                              key: {
                                NUFIN: {
                                  $: unitario[27],
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
                    });
                  }
                });
            })
            .catch((err) => console.error("error:" + err));
        };
      } catch {
        linha = undefined;
      }
    });
};

login_snk();

app.get("/monitor/kanastra/envio_canhoto", function (request, response) {
  response.json({
    envio_canhoto: {
      total: total,
      incluidos: incluidos,
      atualizados: 0,
      erros: erros,
      log_erros: log_erros,
    },
  });
});

app.listen(process.env.PORT || 4003);
