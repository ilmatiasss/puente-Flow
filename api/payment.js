const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { amount, email } = req.body;

        // PEGA AQUÍ LAS LLAVES REALES DE TU CLIENTE (PRODUCCIÓN)
        const apiKey = "4CAEF18E-D096-4560-856E-86697C6BL20B";
        const secretKey = "73043bbffed5af0e96783ccd34c07f13f39a21ce";
        const commerceOrder = `FRUT-${Date.now()}`;

        const flowParams = {
            apiKey: apiKey,
            amount: parseInt(amount),
            commerceOrder: commerceOrder,
            email: email.trim(),
            subject: "Compra en Fruterra",
            urlConfirmation: "https://fruterra.cl/",
            urlReturn: "https://fruterra.cl/"
        };

        const sortedKeys = Object.keys(flowParams).sort();
        let signString = "";
        sortedKeys.forEach((key) => { signString += `${key}=${flowParams[key]}&`; });
        signString = signString.slice(0, -1);

        const signature = crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
        flowParams.s = signature;

        const response = await fetch('https://flow.cl/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(flowParams).toString()
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
