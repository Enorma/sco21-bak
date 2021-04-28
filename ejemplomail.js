const nodemailer = require('nodemailer');

const transporteroptions = {
    "service" : 'mail.ee',
    "auth" : {
        "user" : 'noreply-sco21@mail.ee',
        "pass" : 'HFtXcv6T78'
    }
};

var transporter = nodemailer.createTransport(transporteroptions);

var mailoptions = {
    "from"    : 'noreply-sco21@mail.ee',
    "to"      : 'testsco21@protonmail.com',
    "subject" : 'Me la pelas kikito',
    "text"    : `Y bien pelada`
};

transporter.sendMail(mailoptions, (error, info) => {
    if(error) {
        console.error(error);
    }else {
        console.log('Email sent: ' + info.response);
    }
});

//eof
