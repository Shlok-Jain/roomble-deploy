const nodemailer = require(`nodemailer`);

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "Roomble360@gmail.com", // Your Gmail address
        pass: "soye ozqg fecr serp",    // Your Gmail App Password (Not your real password)
    },
});


async function Sendmail(Recipient_email, Subject, body) {
    const mailOptions = {
        from: "Roomble360@gmail.com",  // Sender's email
        to: Recipient_email,
        subject: Subject,
        text: body,
    };
    let result = await transporter.sendMail(mailOptions);
    if(result.accepted){
        console.log(`Email sent : ${result.response}`);
        return true;
    }
    else{
        console.log(`Failed to send Email`, result);
        return false;
    }
}

module.exports = Sendmail
