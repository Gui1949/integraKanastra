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

let base = "https://gestao.medsystems.com.br";
let base64String;
let jsonid;
let url_consulta =
  base +
  "/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&mgeSession=" +
  jsonid;

let login_snk = (nureneg, res) => {
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

      setTimeout(() => {
        integracao(nureneg, res);
      }, 3000);

      // Send a JSON response to the client with the jsessionid value
    });
};

// let filtrar_dados = () => {
//   console.log("Filtrando dados");
//   fetch(url_consulta, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json;charset=UTF-8",
//       Cookie: "JSESSIONID=" + jsonid,
//     },
//     body: JSON.stringify({
//       serviceName: "DbExplorerSP.executeQuery",
//       requestBody: {
//         sql: `
//         SELECT TOP 1 REN.NURENEG, RECDESP FROM TGFFIN FIN
//         LEFT JOIN TGFREN REN ON REN.NURENEG = FIN.NURENEG
//                 WHERE
//         FIN.AD_FIDIC = 'Y'
//         AND
//         CODEMP = 510
//             AND
//         FIN.RECDESP = 1
//         `,
//       },
//     }),
//   })
//     .then((resp) => resp.text())
//     .then(function (datares) {
//       let linha = "";

//       console.log(datares);
//       try {
//         datares = JSON.parse(datares);
//         linha = datares.responseBody.rows;

//         total = linha.length;

//         console.log(total, "testando");

//         linha.map((li, index) => {
//           setTimeout(() => {
//             integracao(li[0]);
//           }, 1000 * index);
//         });
//       } catch (err) {
//         console.log(err);
//       }
//     });
// };

let integracao = (nureneg, res) => {
  console.log("Iniciando integração");
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
  ISNULL(LTRIM(RTRIM(PAR.NUMEND)),1) as 'sponsorAddressNumber', 
  LTRIM(RTRIM(BAI.NOMEBAI)) as 'sponsorNeighborhood', 
  LTRIM(RTRIM(CID.NOMECID)) as 'sponsorCity', 
  LTRIM(RTRIM(UFS.UF)) as 'sponsorState',
  LTRIM(RTRIM(PAI.DESCRICAO)) as 'sponsorCountry',
  LTRIM(RTRIM(PAR.CEP)) as 'sponsorZipCode', 
  'MEDSYSTEMS COMÉRCIO, IMPORTAÇÃO E EXPORTAÇÃO LTDA' as 'sellerName',
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
  (SELECT
  STRING_AGG(CAB1.CHAVENFE, ',') AS notas
	FROM TGFFIN FIN
	INNER JOIN TGFREN REN ON REN.NUFIN = FIN.NUFIN
	INNER JOIN TGFCAB CAB ON FIN.AD_NUNOTAFDIC = CAB.NUNOTA
	INNER JOIN TGFCAB CAB1 ON CAB1.NUNOTA = AD_NUNOTAFDIC
	WHERE
	REN.NURENEG = ${nureneg} AND CAB.CHAVENFE IS NOT NULL) AS 'invoiceKey',
  (SELECT COUNT(*) FROM TGFFIN WHERE NURENEG = ${nureneg} AND PARCRENEG IS NOT NULL AND RECDESP = 1) AS 'totalInstallments',
  FIN.VLRDESDOB AS 'paymentValue',
  FIN.DTNEG AS 'paymentDate',
  FIN.NUFIN,
  (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NURENEG = ${nureneg} AND PARCRENEG IS NOT NULL AND RECDESP = 1) AS 'valorTotal',
  AD_NUNOTAFDIC AS 'NUNOTA',
  AD_SKUFIDIC,
  NUMNOTA,
  AD_NUFINORIG,
  AD_FIDIC,
(SELECT
STRING_AGG(CONVERT(NVARCHAR(max), NFE.XML), '§ç§') AS notas
FROM TGFFIN FIN
INNER JOIN TGFREN REN ON REN.NUFIN = FIN.NUFIN
INNER JOIN TGFCAB CAB ON FIN.AD_NUNOTAFDIC = CAB.NUNOTA
INNER JOIN TGFCAB CAB1 ON CAB1.NUNOTA = AD_NUNOTAFDIC
LEFT JOIN TGFNFE NFE ON NFE.NUNOTA = CAB1.NUNOTA
WHERE
REN.NURENEG = ${nureneg} AND CAB.CHAVENFE IS NOT NULL) AS 'XML',
(SELECT
  STRING_AGG(CAB1.NUNOTA, ',') AS notas
  FROM TGFFIN FIN
  INNER JOIN TGFREN REN ON REN.NUFIN = FIN.NUFIN
  INNER JOIN TGFCAB CAB ON FIN.AD_NUNOTAFDIC = CAB.NUNOTA
  INNER JOIN TGFCAB CAB1 ON CAB1.NUNOTA = AD_NUNOTAFDIC
  LEFT JOIN TGFNFE NFE ON NFE.NUNOTA = CAB1.NUNOTA
  WHERE
  REN.NURENEG = ${nureneg}) AS 'NUNOTA_ORIGINAL',
  AD_VLRPRESFDIC
  
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
  AND FIN.CODEMP = 510
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

        let xmls = linha[0][34].split("§ç§");

        let base64_xml = [];

        xmls.map((unitario, index) => {
          // fs.createWriteStream('./download/arquivo' + index + '.xml').write(unitario);
          base64_xml.push(btoa(unitario));
        });

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
          //TODO: Alterar para JSON esse body
          body:
            '{"serviceName":"VisualizadorRelatorios.visualizarRelatorio","requestBody":{"relatorio":{"nuRfe":"' +
            numrfe +
            '","parametros":{"parametro":[{"classe":"java.math.BigDecimal","descricao":"NUNOTA","nome":"NUNOTA","pesquisa":"false","requerido":"true","valor":"' +
            linha[0][29] +
            '"}]},"parametrosPK":{"parametro":[]}}}}',
        })
          .then((resp) => resp.text())
          .then(function (datares) {
            let data = JSON.parse(datares);
            let chave;
            try {
              chave = data.responseBody.chave.valor;
              getNota(jsonid, chave);
            } catch (err) {
              chave = 0;
              getNota(jsonid, chave);
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
              try {
                base64String = btoa(
                  String.fromCharCode(...new Uint8Array(buffer))
                );
              } catch {}
              rodar_loop(base64String);
            });
        };

        let rodar_loop = (base64String) => {
          linha.map((unico, index) => {

            let date = unico[22];
            const year = date.slice(4, 8);
            const mouth = date.slice(2, 4);
            const day = date.slice(0, 2);
  
            const dateFormated = new Date(`${year}-${mouth}-${day}`);

            itens.push({
              externalId: unico[27].toString(),
              amount: unico[25],
              dueDate: format(dateFormated, "yyyyMMdd"),
              customFields: {
                preCalculatedAcquisitionPrice: unico[36],
                rateType: "PRE",
              },
            });
          });

          let url_KANASTRA_login = "https://hub.kanastra.com.br/oauth/token";

          let options = {
            method: "POST",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
            },
            body: `{
                "grant_type":"client_credentials",
                "client_id":"67652790",
                "client_secret":"$2y$10$KNAYBGoNPbCwY/cvxzuVeuEzyT3iKEVf/JojlfSctye8LFbGLoxZe",
                "scope": "create-offers"
            }`,
          };

          let date = linha[0][22];
          const year = date.slice(4, 8);
          const mouth = date.slice(2, 4);
          const day = date.slice(0, 2);

          const dateFormated = new Date(`${year}-${mouth}-${day}`);

          fetch(url_KANASTRA_login, options)
            .then((rest) => rest.json())
            .then((json) => {
              let hoje = new Date();

              const body = {
                externalId: linha[0][29],
                sponsorName: linha[0][0],
                sponsorGovernmentId: linha[0][1],
                sponsorPersonType:
                  linha[0][2] == "J" ? "LEGAL_PERSON" : "NATURAL_PERSON",
                sponsorAddress: linha[0][3],
                sponsorAddressNumber: linha[0][4],
                sponsorNeighborhood: linha[0][5],
                sponsorCity: linha[0][6],
                sponsorState: linha[0][7],
                sponsorCountry: linha[0][8],
                sponsorZipCode: linha[0][9],
                sellerName: linha[0][10],
                sellerBank: 341,
                sellerAgency: '81',
                sellerAgencyDigit: '0',
                sellerAccount: '89269',
                sellerAccountDigit: '7',
                sellerGovernmentId: linha[0][11],
                sellerPersonType: linha[0][12],
                sellerAddress: linha[0][13],
                sellerAddressNumber: linha[0][14],
                sellerNeighborhood: linha[0][15],
                sellerCity: linha[0][16],
                sellerState: linha[0][17],
                sellerCountry: linha[0][18],
                sellerZipCode: linha[0][19],
                coobrigation: false,
                customFields: {},
                items: [
                  {
                    assetType: "CONTRATO_DIGITAL",
                    invoiceNumber: linha[0][21].toString(),
                    invoiceDate: format(dateFormated, "yyyyMMdd"),
                    invoiceKey: linha[0][23],
                    totalInstallments: linha[0][24],
                    paymentValue: linha[linha.length - 1][28],
                    customFields: {
                      rateType: "PRE",
                    },
                    paymentDate: format(hoje, "yyyyMMdd"),
                    files: [],
                    installments: itens,
                  },
                ],
              };

              let url =
                base +
                "/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&mgeSession=" +
                jsonid;

              fetch(url, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: "JSESSIONID=" + jsonid,
                },
                body: JSON.stringify({
                  serviceName: "DbExplorerSP.executeQuery",
                  requestBody: {
                    sql: `
                    SELECT CONTEUDO FROM TSIATA ATA 
                    INNER JOIN TGFCAB CAB ON CAB.NUNOTA = ATA.CODATA
                LEFT JOIN AD_XMLCOMPRA COM ON COM.NUNOTA = CAB.NUNOTA
                INNER JOIN TSIEMP EMP ON EMP.CODEMP = CAB.CODEMP
                    WHERE CAB.NUNOTA IN (${linha[0][35]}, ${linha[0][29]})
                    AND ARQUIVO LIKE '%.pdf'
                  `,
                  },
                }),
              })
                .then((resp) => resp.text())
                .then(function (datares) {
                  let resposta = JSON.parse(datares);

                  // return console.log(`${linha[0][35]}, ${linha[0][29]}`)

                  let resposta1 = resposta.responseBody.rows[0][0];
                  resposta = resposta.responseBody.rows[0][0];

                  resposta = Buffer.from(resposta, "hex").toString("base64");

                  body.items[0].files.push({
                    content: resposta,
                    category: "dossie",
                    name: `serasa.pdf`,
                  });

                  resposta1 = Buffer.from(resposta1, "hex").toString("base64");

                  body.items[0].files.push({
                    content: resposta1,
                    category: "contrato_compra",
                    name: `aceite.pdf`,
                  });

                  //TODO: Puxar todas as danfe/nfse, usando um campo igual o invoiceKey, só que com o NUNOTAFDIC

                  base64_xml.map((unitario, index) => {
                    body.items[0].files.push({
                      content: unitario,
                      category: "nfe_xml",
                      name: `arquivo${index}.xml`,
                    });
                  });

                  let invoiceKey_ = linha[0][23].split(",");

                  invoiceKey_.map((unitario, index) => {
                    let newIndex = index + 1;
                    body.customFields["invoicekey" + newIndex] = unitario;
                  });

                  let nunota_pdf = linha[0][35].split(",");

                  nunota_pdf.map((unico) => {
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
                      //TODO: Alterar para JSON esse body
                      body:
                        '{"serviceName":"VisualizadorRelatorios.visualizarRelatorio","requestBody":{"relatorio":{"nuRfe":"' +
                        numrfe +
                        '","parametros":{"parametro":[{"classe":"java.math.BigDecimal","descricao":"NUNOTA","nome":"NUNOTA","pesquisa":"false","requerido":"true","valor":"' +
                        unico +
                        '"}]},"parametrosPK":{"parametro":[]}}}}',
                    })
                      .then((resp) => resp.text())
                      .then(function (datares) {
                        let data = JSON.parse(datares);
                        let chave;
                        try {
                          chave = data.responseBody.chave.valor;
                          getNotaLoop(jsonid, chave);
                        } catch (err) {
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
                            //TODO: Alterar para JSON esse body
                            body:
                              '{"serviceName":"VisualizadorRelatorios.visualizarRelatorio","requestBody":{"relatorio":{"nuRfe":"' +
                              158 +
                              '","parametros":{"parametro":[{"classe":"java.math.BigDecimal","descricao":"NUNOTA","nome":"NUNOTA","pesquisa":"false","requerido":"true","valor":"' +
                              unico +
                              '"}]},"parametrosPK":{"parametro":[]}}}}',
                          })
                            .then((resp) => resp.text())
                            .then(function (datares) {
                              let data = JSON.parse(datares);
                              let chave;
                              try {
                                chave = data.responseBody.chave.valor;
                                getNotaLoop(jsonid, chave, true);
                              } catch (err) {
                                console.log(datares);
                              }
                            });
                        }
                      });

                    let getNotaLoop = (jsonid, chave, servico) => {
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
                          try {
                            base64String = btoa(
                              String.fromCharCode(...new Uint8Array(buffer))
                            );
                          } catch {}

                          body.items[0].files.push({
                            content: base64String,
                            category: servico ? "nfs_pdf" : "nfe_pdf",
                            name: `nfe${unico}.pdf`,
                          });
                        });
                    };
                  });

                  let url_ENVIO =
                    "https://hub.kanastra.com.br/api/credit-originators/fidc-medsystems/offers";

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

                      if (resp.error) {
                        resp.error =
                          "Nº Financeiro: " + linha[0][27] + " - " + resp.error;
                        log_erros.push(resp.error);
                        erros++;
                        res.json({ data: resp.error });
                      } else {
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
                                    AD_SKUFIDIC: {
                                      $: resp.external_id,
                                    },
                                    AD_OFFER_ID: {
                                      $: resp.id,
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
                                    list: "NUFIN, AD_FIDIC, AD_SKUFIDIC",
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

                        res.json({ data: "OK" });
                      }
                    });
                });
            })
            .catch((err) => console.error("error:" + err));
        };
      } catch (err) {
        console.log(err);
        linha = undefined;
      }
    });
};

app.get("/monitor/kanastra/envio", function (request, response) {
  response.json({
    envio: {
      total: total,
      incluidos: incluidos,
      atualizados: 0,
      erros: erros,
      log_erros: log_erros,
    },
  });
});

app.get("/insert/titulo/:nureneg", function (req, res) {
  let nureneg = req.params.nureneg;
  login_snk(nureneg, res);
});

app.listen(process.env.PORT || 40001);
