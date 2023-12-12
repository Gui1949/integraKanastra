const fs = require("fs");
const path = require("path");
const ftp = require('basic-ftp');

async function downloadFiles() {
  const client = new ftp.Client();

  try {
    await client.access({
      host: '10.10.10.8',
      user: 'life_ext',
      password: 'L!@m3d#2075',
      secure: true,
      secureOptions: {
        rejectUnauthorized: false // Disable SSL verification for self-signed certificates
      }
    });

    await client.cd('/files');

    const files = await client.list();

    const localDirectory = './downloaded_files';
    // Create the local directory if it doesn't exist
    if (!fs.existsSync(localDirectory)) {
      fs.mkdirSync(localDirectory);
    }

    // Download each file from the remote directory to the local directory
    for (const file of files) {
      const remoteFilePath = file.name;
      const localFilePath = `${localDirectory}/${file.name}`;

      await client.downloadTo(localFilePath, remoteFilePath);
      console.log(`Downloaded: ${file.name}`);

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
                      CHAVENFE: {
                        $: file.name.replace(".pdf", ""),
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
    client.close(); // Close the connection
  }
}

downloadFiles();
