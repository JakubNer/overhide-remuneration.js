import ohledger_fns from '../fns/ohledger_fns.js';
import imparter_fns from '../fns/imparter_fns.js';

class ohledger {
  static tag = 'ohledger';

  address = null;
  secret = null;
  mode = 'test';
  signedToken = null;

  constructor(overhide_wallet, web3_wallet, getAuthZHeader, getToken, __fetch, fire) {
    this.overhide_wallet = overhide_wallet;
    this.eth_accounts = web3_wallet.eth_accounts;
    this.getAuthZHeader = getAuthZHeader;
    this.getToken = getToken;
    this.__fetch = __fetch;
    this.fire = fire;
  }

  canSetCredentials() {
    return true;
  }  

  canGenerateCredentials() {
    return true;
  }  

  canChangeNetwork() {
    return true;
  }  

  setCredentials(credentials) {
    if (!('secret' in credentials) && !('address' in credentials)) throw new Error("At least one of 'address', 'secret' must be passed into `setCredentials(..)`.");
    if ('address' in credentials && credentials.address) {
      this.address = credentials.address.toLowerCase();
    } else {
      this.address = this.eth_accounts.privateKeyToAccount(credentials.secret).address.toLowerCase();
    }
    this.secret = credentials.secret;
    if (this.secret) {
      try {
        if (!(this.eth_accounts.recover(this.eth_accounts.sign('test message', this.secret)).toLowerCase() == this.address)) {
          throw new Error("'secret' not valid for 'address");
        }
      } catch (err) {
        throw new Error("'secret' not valid for 'address");
      }          
    }
    this.fire('onCredentialsUpdate', { imparterTag: ohledger.tag, address: this.address, secret: this.secret});
    return true;
  }  

  getCredentials() {
    return {"address":this.address, "secret":this.secret};
  }

  generateCredentials(options) {
    const res = this.eth_accounts.create();
    this.address = res.address.toLowerCase();
    this.secret = res.privateKey;
    this.fire('onCredentialsUpdate', { imparterTag: ohledger.tag, address: this.address, secret: this.secret});
    return true;
  }

  setNetwork(details) {
    ohledger_fns.setNetwork_check_details(details);

    this.mode = details.mode;
    this.fire('onNetworkChange', { imparterTag: ohledger.tag, currency: 'USD', mode: details.mode, uri: this.overhide_wallet.remuneration_uri[details.mode]});
    return true;
  }  

  getNetwork() {
    return { "currency": "USD", "mode": this.mode, "uri": this.overhide_wallet.remuneration_uri[this.mode]};
  }

  getOverhideRemunerationAPIUri() {
    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    return this.overhide_wallet.remuneration_uri[this.mode];
  }

  async getFromDollars(dollarAmount) {
    return dollarAmount * 100;
  }

  async getTxs(recipient, date, tallyOnly, tallyDollars) {
    imparter_fns.getTxs_check_details(recipient, date);

    const to = recipient.address;
    if ('token' in recipient && recipient.token && 'signature' in recipient && recipient.signature) {
      var authZHeader = `Bearer ${recipient.token}`;
      var signature = recipient.signature;
    } else {
      var authZHeader = this.getAuthZHeader();
      var signature = this.signedToken;
    }
    const uri = this.getOverhideRemunerationAPIUri();

    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    if (!this.address) throw new Error("from 'address' not set: use setCredentials");
    const from = this.address;

    return await imparter_fns.getTxs_retrieve(uri, from, to, tallyOnly, tallyDollars, date, authZHeader, this.__fetch, signature);
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
      var message = this.getToken();
      var signature = await this.sign(message);
    }

    return await imparter_fns.isSignatureValid_call(uri, signature, message, from, this.getAuthZHeader(), this.__fetch);
  }

  async sign(message) {
    if (!this.secret) throw new Error(`Secret for imparter ${ohledger.tag} not set, cannot sign.`);
    const signature = await this.eth_accounts.sign(message, this.secret).signature;
    if (message === this.getToken()) {
      this.signedToken = signature;
    }
    return signature;
  }

  async createTransaction(amount, to, options) {
    if (!this.mode) throw new Error("network 'mode' must be set, use setNetwork");
    if (!this.address) throw new Error("from 'address' not set: use setCredentials");
    const from = this.address;
    const uri = this.getOverhideRemunerationAPIUri();

    const [message, signature] = await ohledger_fns.createTransaction(
      this.getToken(),
      this.signedToken,
      amount, 
      from,
      to,
      (message) => this.sign(message),
      (from, signature, message) => this.overhide_wallet.showOhLedgerGratisIframeUri(uri, from, signature, message), 
      this.overhide_wallet.oh_ledger_transact_fn[this.mode], 
      options);

    if (message === this.getToken()) {
      this.signedToken = signature;
    }     

    return true;
  }  
}

export default ohledger;