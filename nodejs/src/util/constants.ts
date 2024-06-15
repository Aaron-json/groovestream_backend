export enum Environment {
  DEVELOPMENT = "development",
  PRODUCTION = "production"
}
export let ENVIRONMENT: Environment;

export function ParseEnvFlags() {
  const args = process.argv
  if (args.length == 2) {
    console.error("Error: No environment flag provided. Please provide --dev or --prod")
    process.exit()
  } else {
    let ifProd = false
    let ifDev = false
    for (let i = 2; i < args.length; i++) {
      if (args[i] == "--dev") {
        ifDev = true
      }
      if (args[i] == "--prod") {
        ifProd = true
      }
    }
    if (ifProd && ifDev) {
      console.error("Cannot have both --dev and --prod flags")
      process.exit()
    } else if (!ifProd && !ifDev) {
      console.error("Cannot have neither --dev nor --prod flags")
      process.exit()
    } else if (ifProd) {
      ENVIRONMENT = Environment.PRODUCTION
    } else {
      ENVIRONMENT = Environment.DEVELOPMENT
    }
  }
}
ParseEnvFlags()
