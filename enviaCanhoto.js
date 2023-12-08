const fs = require("fs");
const path = require("path");
const Client = require("ssh2-sftp-client");

async function downloadFiles() {
  const sftp = new Client();

  try {
    const config = {
      host: "msp-thanos",
      port: "22", // Usually 22 for SFTP
      username: "desenvolvimento",
      privateKey: fs.readFileSync("./chavem.pem"), // Use if connecting via private key
    };

    await sftp.connect(config);

    const remoteDir = "/pdfs"; // Remote directory containing the files
    const localDir = "./downloaded_files"; // Local directory where files will be downloaded

    // Create the local directory if it doesn't exist
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir);
    }

    // List files in the remote directory
    const files = await sftp.list(remoteDir);

    // Download each file from the remote directory to the local directory
    for (const file of files) {
      const remoteFilePath = path.join(remoteDir, file.name);
      const localFilePath = path.join(localDir, file.name);

      await sftp.get(remoteFilePath, localFilePath);

      const base64Pdf = fs.readFileSync(`./downloaded_files/${file.name}`, {
        encoding: "base64",
      });
     
      const login_snk = () => {
        let credentials = {
          username: "INTEGRA.EVUP",
          password: "Med@sys22",
        };

        const base = "http://msp-ironman:8380";

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
                      NUMNOTA: {
                        $: file.name,
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
              });

            // Send a JSON response to the client with the jsessionid value
          });
      };

      login_snk();
    }
  } catch (err) {
    console.error(err);
  } finally {
    sftp.end(); // Close the SFTP connection
  }
}

downloadFiles();
