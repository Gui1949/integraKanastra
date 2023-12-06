const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

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
  LTRIM(RTRIM(PAR.RAZAOSOCIAL)) AS 'sponsorName', 
  LTRIM(RTRIM(CGC_CPF)) as 'sponsorGovernmentId',
  LTRIM(RTRIM(TIPPESSOA)) as 'sponsorPersonType',  
  LTRIM(RTRIM(UPPER(CONCAT(ENDE.TIPO, ' ', ENDE.NOMEEND)))) AS 'sponsorAdress',
  LTRIM(RTRIM(PAR.NUMEND)) as 'sponsorAdressNumber', 
  LTRIM(RTRIM(BAI.NOMEBAI)) as 'sponsorNeighborhood', 
  LTRIM(RTRIM(CID.NOMECID)) as 'sponsorCity', 
  LTRIM(RTRIM(UFS.UF)) as 'sponsorState',
  LTRIM(RTRIM(PAI.DESCRICAO)) as 'sponsorCountry',
  LTRIM(RTRIM(PAR.CEP)) as 'sponsorZipCode', 
  LTRIM(RTRIM(EMP.RAZAOSOCIAL)) as 'sellerName',
  LTRIM(RTRIM(EMP.CGC)) as 'sellerGovernmentId', 
  'J' AS 'sellerPersonType', 
  LTRIM(RTRIM(UPPER(CONCAT(ENDE_EMP.TIPO, ' ', ENDE_EMP.NOMEEND)))) AS 'sellerAdress',
  LTRIM(RTRIM(EMP.NUMEND)) as 'sellerAdressNumber',
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
  NURENEG = 20822))) AS 'invoiceKey',
  (SELECT COUNT(*) FROM TGFFIN WHERE NURENEG = 20822 AND PARCRENEG IS NOT NULL AND RECDESP = 1) AS 'totalInstallments',
  FIN.VLRDESDOB AS 'paymentValue',
  FIN.DTNEG AS 'paymentDate',
  FIN.NUFIN,
  (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NURENEG = 20822 AND PARCRENEG IS NOT NULL AND RECDESP = 1) AS 'valorTotal',
  (SELECT NUNOTA FROM TGFCAB WHERE NUNOTA = (SELECT NUNOTA FROM TGFFIN WHERE NUFIN = (SELECT NUFIN FROM TGFREN
    WHERE 
    NURENEG = 20822))) AS 'NUNOTA'
  
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
  NURENEG = 20822 AND PARCRENEG IS NOT NULL AND RECDESP = 1
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
            itens.push({
              assetType: unico[20],
              files: [
                {
                  content: index == 0 ? base64String : "",
                  category: "nfe_pdf",
                  name: "danfe.pdf",
                },
              ],
              installments: [
                {
                  externalId: unico[27],
                  amount: unico[25],
                  dueDate: unico[22],
                  customFields: {},
                },
              ],
            });
          });

          const url =
            "https://virtserver.swaggerhub.com/Kanastra/tech-hub/1.1.0/api/credit-originators/7969/offers";
          const body = {
            sponsorName: linha[0][0],
            sponsorGovernmentId: linha[0][1],
            sponsorPersonType: linha[0][2],
            sponsorAdress: linha[0][3],
            sponsorAdressNumber: linha[0][4],
            sponsorNeighborhood: linha[0][5],
            sponsorCity: linha[0][6],
            sponsorState: linha[0][7],
            sponsorCountry: linha[0][8],
            sponsorZipCode: linha[0][9],
            sellerName: linha[0][10],
            sellerGovernmentId: linha[0][11],
            sellerPersonType: linha[0][12],
            sellerAdress: linha[0][13],
            sellerAdressNumber: linha[0][14],
            sellerNeighborhood: linha[0][15],
            sellerCity: linha[0][16],
            sellerState: linha[0][17],
            sellerCountry: linha[0][18],
            sellerZipCode: linha[0][19],
            assetType: linha[0][20],
            invoiceNumber: linha[0][21],
            invoiceDate: linha[0][22],
            invoiceKey: linha[0][23],
            totalInstallments: linha[0][24],
            paymentValue: linha[0][28],
            paymentDate: linha[0][26],
            coobrigation: false,
            customFields: {},
            items: itens,
          };

          fetch(url, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }).then((response) => {
            console.log(response.status);
            console.log(JSON.stringify(body));
          });
        };
      } catch {
        linha = undefined;
      }
    });
};

login_snk();
