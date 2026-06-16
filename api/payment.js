const crypto = require('crypto');
const querystring = require('querystring');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        let amount;
        let email = "cliente@correo.com";

        // Parser robusto para capturar los datos del formulario nativo de Horizons
        if (req.body) {
            let dataObj = req.body;
            if (typeof req.body === 'string') {
                // Si viene codificado como URL (amount=4500&email=...)
                if (req.body.includes('=')) {
                    dataObj = querystring.parse(req.body);
                } else {
                    try { dataObj = JSON.parse(req.body); } catch(e){}
                }
            }
            amount = dataObj.amount;
            email = dataObj.email || email;
        }

        // ---- [CREDANCIALES DE PRODUCCIÓN] ----
        const apiKey = "4CAEF18E-D096-4560-856E-86697C6BL20B";
        const secretKey = "73043bbffed5af0e96783ccd34c07f13f39a21ce";
        // --------------------------------------
        
        const commerceOrder = `FRUT-${Date.now()}`;

        if (!amount) {
            return res.status(400).send("Falta el parámetro 'amount'. Vuelve a intentar.");
        }

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

        if (data && data.url && data.token) {
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head><title>Redireccionando...</title></head>
                <body>
                    <script>
                        window.location.href = "${data.url}?token=${data.token}";
                    </script>
                </body>
                </html>
            `);
        } else {
            return res.status(400).send("Error de Flow: " + JSON.stringify(data));
        }

    } catch (error) {
        return res.status(500).send("Error interno: " + error.message);
    }
};
