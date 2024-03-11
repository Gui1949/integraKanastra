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

const base = "http://10.10.10.6:8180";
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
  console.log("fitlrar");

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
          SELECT DISTINCT FIN.NURENEG, AD_NUNOTAFDIC
          FROM TGFFIN FIN
          LEFT JOIN AD_REGENTITE ITE ON ITE.NUNOTA = FIN.AD_NUNOTAFDIC
          LEFT JOIN TGFCAB CAB ON CAB.NUNOTA = FIN.AD_NUNOTAFDIC
          LEFT JOIN AD_CANHOTOFTP FTP ON FTP.CHAVENFE = CAB.CHAVENFE
          WHERE 
          FIN.CODEMP = 510
          AND 
          FIN.AD_FIDIC = 'I' AND
          AD_NUNOTAFDIC IS NOT NULL AND NURENEG IS NOT NULL
          AND 
          (
          CANHOTONF IS NOT NULL 
          OR 
          FTP.CONTEUDO IS NOT NULL
          )
        `,
      },
    }),
  })
    .then((resp) => resp.text())
    .then(function (datares) {
      console.log(datares);

      let linha = "";
      try {
        datares = JSON.parse(datares);
        linha = datares.responseBody.rows;

        linha.forEach((li, index) => {
          setTimeout(() => {
            console.log(`Integração nº ${index}, NU ${li[0]} - SKU ${li[1]}`);
            integracao(li[0], li[1]);
          }, 10000 * index);
        });
      } catch {}
    });
};

let integracao = (nureneg, sku, res) => {
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
  LTRIM(RTRIM(PAR.NUMEND)) as 'sponsorAddressNumber', 
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
  FIN.NUMNOTA,
  AD_NUFINORIG,
  FIN.AD_FIDIC,
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
  AD_VLRPRESFDIC,
  ISNULL(FTP.CONTEUDO, RITE.CANHOTONF)
  AD_OFFER_ID
  
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

  INNER JOIN TGFCAB CAB ON CAB.NUNOTA = FIN.AD_NUNOTAFDIC
  LEFT JOIN AD_CANHOTOFTP FTP ON CAB.CHAVENFE = FTP.CHAVENFE
  LEFT JOIN AD_REGENTITE RITE ON RITE.NUNOTA = CAB.NUNOTA
  
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

        let base64_xml = [];

        try {
          let xmls = linha?.[0]?.[34].split("§ç§");
          xmls.map((unitario, index) => {
            // fs.createWriteStream('./download/arquivo' + index + '.xml').write(unitario);
            base64_xml.push(btoa(unitario));
          });
        } catch (e) {
          erros++;
          log_erros.push(e);
        }

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
              } catch {
                base64String = undefined;
              }
              rodar_loop(base64String);
            });
        };

        let rodar_loop = (base64String) => {
          linha.map((unico, index) => {
            let date = unico[22];
            const year = 2024;
            const mouth = 12;
            const day = 25;

            //TODO: Arrumar due date para o dia atual

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
                files: [],
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

                  let resposta1 = resposta?.responseBody?.rows?.[0]?.[0];
                  resposta = resposta?.responseBody?.rows?.[0]?.[0];

                  try {
                    resposta = Buffer.from(resposta, "hex").toString("base64");
                  } catch {
                    resposta = "2tfwg35yhet46u4eh46u";
                  }

                  body.files.push({
                    content: resposta,
                    category: "dossie",
                    name: `serasa.pdf`,
                  });

                  body.files.push({
                    content: linha[0][37] || "2tfwg35yhet46u4eh46u",
                    category: "comprovante_assinatura",
                    name: `canhoto.pdf`,
                  });

                  try {
                    resposta1 = Buffer.from(resposta1, "hex").toString(
                      "base64"
                    );
                  } catch {
                    resposta1 = "2tfwg35yhet46u4eh46u";
                  }

                  body.files.push({
                    content: resposta1,
                    category: "contrato_compra",
                    name: `aceite.pdf`,
                  });

                  //TODO: Puxar todas as danfe/nfse, usando um campo igual o invoiceKey, só que com o NUNOTAFDIC

                  base64_xml.map((unitario, index) => {
                    body.files.push({
                      content: unitario,
                      category: "nfe_xml",
                      name: `arquivo${index}.xml`,
                    });
                  });

                  let nunota_pdf = linha?.[0]?.[35].split(",");

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
                          } catch {
                            base64String = undefined;
                          }

                          body.files.push({
                            content: base64String,
                            category: servico ? "nfs_pdf" : "nfe_pdf",
                            name: `nfe${unico}.pdf`,
                          });
                        });
                    };
                  });

                  let url_ENVIO =
                    "https://hub.kanastra.com.br/api/credit-originators/fidc-medsystems/offers/" +
                    linha[0][29];

                  const str = JSON.stringify(body);
                  const filename = "input.txt";

                  fs.open(filename, "a", (err, fd) => {
                    if (err) {
                      console.log(err.message);
                    } else {
                      fs.write(fd, str, (err, bytes) => {
                        if (err) {
                          console.log(err.message);
                        } else {
                          console.log(bytes + " bytes written");
                        }
                      });
                    }
                  });

                  fetch(url_ENVIO, {
                    method: "PATCH",
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
                        resp.error =
                          "Nº Financeiro: " + linha[0][27] + " - " + resp.error;
                        log_erros.push(resp.error);
                        erros++;
                        res.json({ data: resp.error });
                      } else {
                        incluidos++;

                        // linha.map((unitario) => {
                        //   let atualizaParceiro = {
                        //     serviceName: "CRUDServiceProvider.saveRecord",
                        //     requestBody: {
                        //       dataSet: {
                        //         rootEntity: "Financeiro",
                        //         includePresentationFields: "N",
                        //         dataRow: {
                        //           localFields: {
                        //             AD_FIDIC: {
                        //               $: "I",
                        //             },
                        //             AD_SKUFIDIC: {
                        //               $: resp.external_id,
                        //             },
                        //             AD_OFFER_ID: {
                        //               $: resp.id,
                        //             },
                        //           },
                        //           key: {
                        //             NUFIN: {
                        //               $: unitario[27],
                        //             },
                        //           },
                        //         },
                        //         entity: {
                        //           fieldset: {
                        //             list: "NUFIN, AD_FIDIC, AD_SKUFIDIC",
                        //           },
                        //         },
                        //       },
                        //     },
                        //   };

                        //   fetch(
                        //     base +
                        //       "/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json",
                        //     {
                        //       method: "POST",
                        //       headers: {
                        //         "Content-Type": "text/xml; charset=utf-8",
                        //         Accept: "*/*",
                        //         "Accept-Language": "en-GB",
                        //         "Accept-Encoding": "gzip, deflate",
                        //         Connection: "Keep-alive",
                        //         "Content-Length": atualizaParceiro.length,
                        //         Cookie: "JSESSIONID=" + jsonid,
                        //       },
                        //       body: JSON.stringify(atualizaParceiro),
                        //     }
                        //   )
                        //     .then((resp) => resp.text())
                        //     .then((resposta) => {
                        //       console.log(resposta);
                        //     });
                        // });

                        // res.json({ data: "OK" });
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

login_snk();

app.get("/monitor/kanastra/send_canhoto", function (request, response) {
  response.json({
    send_canhoto: {
      total: incluidos + erros,
      incluidos: incluidos,
      atualizados: 0,
      erros: erros,
      log_erros: log_erros,
    },
  });
});

app.listen(process.env.PORT || 40004);
