const crypto = require('crypto');

async function signature() {
  const config = {
    dirPath: '', // 存放到哪个目录下
    bucket: 'atmircoapposs',
    region: 'oss-cn-shenzhen', // 我的是 hangzhou
    accessKeyId: 'LTAI4GFerxkhsuV2zBXp5qNV', //   LTAI4G2EVAkEFnKRoEGfYchg
    accessKeySecret: 'vyn3Hoo4wksJ4Hhhe4iZDPdvBpc2hJ',// Lk00vpwtr6Gj54utTbRM1QMztOrcSz
    expAfter: 100000, // 签名失效时间，毫秒
    maxSize: 1048576000 // 文件最大的 size
  };

  const host = `https://${config.bucket}.${config.region}.aliyuncs.com`;
  const expireTime = new Date().getTime() + config.expAfter;
  const expiration = new Date(expireTime).toISOString();
  const policyString = JSON.stringify({
    expiration,
    conditions: [
      ['content-length-range', 0, config.maxSize],
      ['starts-with', '$key', config.dirPath]
    ]
  });
  const policy = Buffer.from(policyString).toString('base64');

  const signature = crypto.createHmac('sha1', config.accessKeySecret).update(policy).digest('base64');

  return {
    'signature': signature,
    'policy': policy,
    'host': host,
    'accessid': config.accessKeyId,
    'expire': parseInt(expireTime / 1000),
    'dir': config.dirPath
  };
}

module.exports.signature = signature;
