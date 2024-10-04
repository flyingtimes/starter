const sdk = require('node-appwrite');
const crypto = require('crypto');

module.exports = async function (req, res) {
  const client = new sdk.Client();
  const databases = new sdk.Databases(client);

  if (
    !req.variables['APPWRITE_FUNCTION_ENDPOINT'] ||
    !req.variables['APPWRITE_FUNCTION_API_KEY'] ||
    !req.variables['APPWRITE_FUNCTION_PROJECT_ID'] ||
    !req.variables['APPWRITE_DATABASE_ID'] ||
    !req.variables['APPWRITE_PAY_COLLECTION_ID']
  ) {
    console.warn("Environment variables are not set. Function cannot use Appwrite SDK.");
    return res.json({ error: 'Server configuration error' }, 500);
  }

  client
    .setEndpoint(req.variables['https://cloud.appwrite.io/v1'])
    .setProject(req.variables['667042580023efd88353'])
    .setKey(req.variables['67002b08002fad684a7e']);

  try {
    // 从 pay 集合中获取支付凭证
    const payCredentials = await databases.listDocuments(
      req.variables['6670429f002270322b0d'],
      req.variables['67002d4f003e28f83d0b']
    );

    if (payCredentials.documents.length === 0) {
      return res.json({ error: 'Payment credentials not found' }, 400);
    }

    const { yungouos_mch_id, yungouos_key } = payCredentials.documents[0];

    if (!yungouos_mch_id || !yungouos_key) {
      return res.json({ error: 'Invalid payment credentials' }, 400);
    }

    const outTradeNo = `TOKEN${Date.now()}`;
    const totalFee = '100'; // 1元，单位为分
    const body = 'Purchase Token';

    const params = {
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      mch_id: yungouos_mch_id,
      body: body,
      type: '2', // 返回base64图片
    };

    const sign = calculateSign(params, yungouos_key);
    params.sign = sign;

    const response = await fetch('https://api.pay.yungouos.com/api/pay/wxpay/codePay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    });

    const data = await response.json();

    if (data.code === '0') {
      return res.json({ qrCodeUrl: data.data });
    } else {
      return res.json({ error: data.msg }, 400);
    }
  } catch (error) {
    console.error('Error:', error);
    return res.json({ error: 'Failed to generate QR code' }, 500);
  }
};

function calculateSign(params, key) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  const signStr = `${sortedParams}&key=${key}`;
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}
