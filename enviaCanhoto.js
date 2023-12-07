const ftp = require("ftp");

const host = "speedtest.tele2.net";
const username = "";
const password = "";
const filename = "5MB.zip";
const localPath = "./downloads";

 const client = new ftp()
 client.connect(host, function(err) {
    return null
  if (err) {
    console.log(err);
    return;
  }

  client.login(username, password, function(err) {
    if (err) {
      console.log(err);
      return;
    }

    client.get(filename, localPath, function(err) {
      if (err) {
        console.log(err);
        return;
      }

      console.log("Arquivo baixado com sucesso!");
      client.end();
    });
  });
});
