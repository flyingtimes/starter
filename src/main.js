const sdk = require('node-appwrite');
const crypto = require('crypto');

/*
  'req' variable has:
    'headers' - object with request headers
    'payload' - request body data as a string
    'variables' - object with function variables

  'res' variable has:
    'send(text, status)' - function to return text response. Status code defaults to 200
    'json(obj, status)' - function to return JSON response. Status code defaults to 200
  
  If an error is thrown, a response with code 500 will be returned.
*/

module.exports = async function (req, res) {
  const client = new sdk.Client();

  if (
    !req.variables['APPWRITE_FUNCTION_ENDPOINT'] ||
    !req.variables['APPWRITE_FUNCTION_API_KEY']
  ) {
    console.warn("Environment variables are not set. Function cannot use Appwrite SDK.");
  } else {
    client
      .setEndpoint(req.variables['APPWRITE_FUNCTION_ENDPOINT'])
      .setProject(req.variables['APPWRITE_FUNCTION_PROJECT_ID'])
      .setKey(req.variables['APPWRITE_FUNCTION_API_KEY']);
  }

  const yungouosMchId = req.variables['YUNGOUOS_MCH_ID'];
  const yungouosKey = req.variables['YUNGOUOS_KEY'];

  if (!yungouosMchId || !yungouosKey) {
    return res.json({ error: 'Missing YunGouOS credentials' }, 400);
  }

  const outTradeNo = `TOKEN${Date.now()}`;
  const totalFee = '100'; // 1元，单位为分
  const body = 'Purchase Token';

  const params = {
    out_trade_no: outTradeNo,
    total_fee: totalFee,
    mch_id: yungouosMchId,
    body: body,
    type: '2', // 返回base64图片
  };

  const sign = calculateSign(params, yungouosKey);
  params.sign = sign;

  try {
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
    console.error('Error calling payment API:', error);
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
