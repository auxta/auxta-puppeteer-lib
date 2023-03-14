const twofactor = require("node-2fa");

export class Aux2fa {

    constructor() {
    }

    public authenticator() {
        const aux2fe_secret = this.getSecret();
        return twofactor.generateToken(aux2fe_secret).token;
    }

    public verifyToken(token: string) {
        const aux2fe_secret = this.getSecret();
        const result = twofactor.verifyToken(aux2fe_secret,token);
        if (result != null) {
            if (result.delta == 0) {
                return true;
            }
        }
        return false;
    }

    private getSecret() {
        const aux2fe_secret = process.env.aux2fe_secret;
        if (!aux2fe_secret) {
            throw new Error('No 2fe secret set');
        }
        return aux2fe_secret;
    }
}

export default new Aux2fa();