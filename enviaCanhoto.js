let criaRegistro = {
  serviceName: "CRUDServiceProvider.saveRecord",
  requestBody: {
    dataSet: {
      rootEntity: "AD_CANHOTOFTP",
      includePresentationFields: "N",
      dataRow: {
        localFields: {
          CONTEUDO: {
            $: "BASE64",
          },
        }
      },
      entity: {
        fieldset: {
          list: "ID",
        },
      },
    },
  },
};

// console.log(atualizaParceiro.requestBody);

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
      "Content-Length": criaRegistro.length,
      Cookie: "JSESSIONID=" + jsonid,
    },
    body: JSON.stringify(criaRegistro),
  }
)
  .then((resp) => resp.text())
  .then((resposta) => {
    console.log(resposta);
  });
