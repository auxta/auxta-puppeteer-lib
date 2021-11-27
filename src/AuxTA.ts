import puppeteer, { Puppeteer } from "./puppeteer/puppeteer";
import { FunctionHelper } from "./macros/helpers/code.helper";
import path from "path";
import fs from "fs";
import StatusOfStep from "./auxta/enums/status-of.step";
import { UploadModel } from "./auxta/models/upload.model";
import * as dotenv from "dotenv";
import { setupConfig, config as c, setupOverrideConfig } from "./auxta/configs/config";
import { startSuite } from "./auxta/utilities/start-suite.helper";
import { createEmptyReport } from "./auxta/services/report.service";

dotenv.config();

class AuxTA extends FunctionHelper {
    public puppeteer: Puppeteer = puppeteer;
    public config = c;

    private readonly uploadModel: UploadModel;

    constructor() {
        super();
        let file;
        try {
            let currentDir = ""
            while (true) {
                file = path.join(__dirname, currentDir, "auxta.json");
                if (!fs.existsSync(file)) {
                    currentDir += "../"
                    if (currentDir.length >= 30) {
                        console.log("auxta.json file not found!")
                        process.exit(1);
                        return;
                    }
                    continue;
                }
                break;
            }
            const jsonConfig = JSON.parse(fs.readFileSync(file).toString());
            try {
                this.config = setupConfig(jsonConfig)
            } catch (e: any) {
                console.log("Missing field in auxta.json:", e.message)
            }
            this.uploadModel = new UploadModel(jsonConfig.organization, jsonConfig.baseURL, jsonConfig.digitalProduct);
        } catch (e: any) {
            console.log("Missing or corrupted config: auxta.json. Searching in location:", file)
            console.log(e);
            process.exit(1);
        }
    }

    public async run(event: any, overrideConfig?: any) {
        this.changeModelData(overrideConfig);
        let reportId: string | undefined = event.queryStringParameters.reportId;
        if (process.env.ENVIRONMENT === 'LIVE' && event.queryStringParameters.token !== this.config.token)
            return {statusCode: 401, message: 'Unauthorized'}
        const suites = this.config.suitesList.slice(0);
        await startSuite(suites, reportId || await createEmptyReport(this.uploadModel));
        return {statusCode: 204}
    }
    private changeModelData(overrideConfig?: any){
        if (overrideConfig) {
            if (overrideConfig.digitalProduct) this.uploadModel.digitalProduct = overrideConfig.digitalProduct
            if (overrideConfig.environment) this.uploadModel.environment = overrideConfig.environment
            if (overrideConfig.baseUrl) this.uploadModel.baseUrl = overrideConfig.baseUrl
            this.config = setupOverrideConfig(overrideConfig)
        }
    }

    public async startBrowser(event: any, callback: any, feature: string, scenario: string, overrideConfig?: any, singleFeature = false) {
        this.changeModelData(overrideConfig);
        if (singleFeature) {
            if (process.env.ENVIRONMENT === 'LIVE' && event.queryStringParameters.token !== this.config.token)
                return {statusCode: 401, message: 'Unauthorized'}
            this.uploadModel.reportId = await createEmptyReport(this.uploadModel);
            this.uploadModel.nextSuites = [];
        }
        return this.puppeteer.run(event, callback, feature, scenario)
    }

    public getUploadModel(): UploadModel {
        return this.uploadModel;
    }
}

export const StepStatus = StatusOfStep;

const auxta: AuxTA = new AuxTA();

export default auxta;
