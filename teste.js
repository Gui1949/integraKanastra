let date = new Date();

let day = date.getDate().toString().padStart(2, "0");
let mouth = (date.getMonth() + 1).toString().padStart(2, "0");

let year = date.getFullYear();

const dateFormated = new Date(`${year}-${mouth}-${day}`);


console.log(dateFormated)