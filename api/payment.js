const crypto = require('crypto');

module.exports = async (req, res) => {
    // Headers de CORS por seguridad
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Al enviar por formulario tradicional, los datos llegan directo en req.body
        const amount = req.body?.amount;
        const email = req.body?.email || "cliente@correo.com";

        // ---- [REEMPLAZA AQUÍ CON LAS LLAVES REALES DE PRODUCCIÓN] ----
        const apiKey = "4CAEF18E-D096-4560-856E-86697C6BL20B";
        const secretKey = "73043bbffed5af0e96783ccd34c07f13f39a21ce";
        // -------------------------------------------------------------
        
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

        // 1. Ordenar parámetros alfabéticamente
        const sortedKeys = Object.keys(flowParams).sort();
        let signString = "";
        sortedKeys.forEach((key) => { signString += `${key}=${flowParams[key]}&`; });
        signString = signString.slice(0, -1);

        // 2. Generar firma HMAC-SHA256 con la librería nativa de Node
        const signature = crypto.createHmac('sha256', secretKey).update(signString).digest('hex');
        flowParams.s = signature;

        // 3. Llamada interna de servidor a servidor hacia la API de Flow
        const response = await fetch('https://flow.cl/api/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(flowParams).toString()
        });

        const data = await response.json();

        if (data && data.url && data.token) {
            // TRUCO MAESTRO: Como este archivo se ejecuta en el navegador tras el submit, 
            // respondemos con un script HTML que inyecta la redirección visual automática a Webpay.
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
        return res.status(500).send("Error interno en el puente: " + error.message);
    }
};
