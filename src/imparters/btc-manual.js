import imparter_fns from '../fns/imparter_fns.js';

class btc_manual {
  static tag = 'btc-manual';

  remuneration_uri = {
    'prod':'https://bitcoin.overhide.io',
    'test':'https://test.bitcoin.overhide.io'
  };

  url = 'https://overhide.github.io/ledgers.js/src/frames';
  address = null;
  mode = 'test';

  constructor(domFns, getAuthZHeader, __fetch, fire) {
    this.domFns = domFns;
    this.getAuthZHeader = getAuthZHeader;
    this.__fetch = __fetch;
    this.fire = fire;

    window.addEventListener('message', (e) => {
      if (!e.data || !e.data.event) return;
      switch(e.data.event) {
        case 'oh$-popup-signature':
          if ('detail' in e.data && e.data.detail && 'signature' in e.data.detail) {
            this.domFns.makePopupHidden(e.data.detail.signature, false);
          } else {
            this.domFns.makePopupHidden(`no signature`, true);      
          }          
          break;
      }
    });    
  }

  canSetCredentials() {
    return true;
  }  

  canGenerateCredentials() {
    return false;
  }  

  canChangeNetwork() {
    return true;
  }  

  setCredentials(credentials) {
    if (!('address' in credentials)) throw new Error("'address' must be passed in");
    switch(this.mode) {
      case 'test':
        if (!/^(tb(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[mn2][a-km-zA-HJ-NP-Z1-9]{25,39})$/.test(credentials.address)) {
          throw new Error(`invalid bitcoin_testnet address: ${credentials.address}`);
        }
        break;
      case 'prod':
        if (!/^(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})$/.test(credentials.address)) {
          throw new Error(`invalid bitcoin address: ${credentials.address}`);
        }
        break;
    }
    this.address = credentials.address;
    this.fire('onCredentialsUpdate', { imparterTag: btc_manual.tag, address: this.address});
    return true;
  }  

  getCredentials() {
    return {"address":this.address};
  }

  generateCredentials(options) {
    return false;
  }

  setNetwork(details) {
    if (!('mode' in details)) throw new Error("'mode' must be passed in");
    details.mode = details.mode.toLowerCase();
    if (details.mode !== 'prod' && details.mode !== 'test') throw new Error("'mode' must be 'prod' or 'test'");    
    this.mode = details.mode;
    this.fire('onNetworkChange', { imparterTag: btc_manual.tag, mode: details.mode, uri: this.remuneration_uri[details.mode]});
    return true;
  }  

  getNetwork() {
    return { "mode": this.mode, "uri": this.remuneration_uri[this.mode]};
  }

  getOverhideRemunerationAPIUri() {
    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    return this.remuneration_uri[this.mode];
  }

  async getFromDollars(dollarAmount) {
    const hostPrefix = this.mode === 'main' ? '' : 'test.';
    const now = (new Date()).toISOString();
    const result = await this.__fetch(`https://${hostPrefix}rates.overhide.io/rates/sat/${now}`, {
        headers: new Headers({
          'Authorization': this.getAuthZHeader()
        })
      })
      .then(res => res.json())
      .catch(e => {
        throw String(e)
      });
    if (!result || result.length === 0 || ! 'minrate' in result[0] || result[0].minrate === 0) return 0;
    return dollarAmount / result[0].minrate;
  }

  async getTxs(recipient, date, tallyOnly, tallyDollars) {
    imparter_fns.getTxs_check_details(recipient, date);

    const to = recipient.address;
    const uri = this.getOverhideRemunerationAPIUri();

    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    if (!this.address) throw new Error("from 'address' not set: use setCredentials");
    const from = this.address;

    return await imparter_fns.getTxs_retrieve(uri, from, to, tallyOnly, tallyDollars, date, this.getAuthZHeader(), this.__fetch);
  }

  async isOnLedger(options) {
    const uri = this.getOverhideRemunerationAPIUri();
    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    if (!this.address) throw new Error("from 'address' not set: use setCredentials");
    const from = this.address;
    if (!uri) throw new Error('no uri for request, unsupported network selected in wallet?');

    if ('message' in options && options.message && 'signature' in options && options.signature) {
      var message = options.message;
      var signature = options.signature;
    } else {
      var message = `verify ownership of address by signing on ${new Date().toLocaleString()}`;
      var signature = await this.sign(message);
    }

    return await imparter_fns.isSignatureValid_call(uri, signature, message, from, this.getAuthZHeader(), this.__fetch);
  }

  async sign(message) {
    if (!this.address) throw new Error(`credentials for imparter ${btc_manual.tag} not set`);

    this.domFns.hideAllPopupContents();
    const base64Message = btoa(message);
    this.domFns.setFrame(`${this.url}/btc_manual_sign.html?address=${this.address}&message=${base64Message}&token=${this.getAuthZHeader()}&isTest=${this.mode == 'test'}`, 70, 40);
    return atob(await this.domFns.makePopupVisible());
  }

  async createTransaction(amount, to, options) {
    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    if (!this.address) throw new Error("from 'address' not set: use setCredentials");
    const from = this.address;

    this.domFns.hideAllPopupContents();
    this.domFns.setFrame(`${this.url}/btc_manual_createTransaction.html?from=${this.address}&to=${to}&value=${amount}&isTest=${this.mode == 'test'}`, 70, 45);
    await this.domFns.makePopupVisible();

    return true;
  }  
}

export default btc_manual;