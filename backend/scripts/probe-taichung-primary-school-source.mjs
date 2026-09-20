import { probeTaichungPrimarySchoolSource } from './connectors/taichung-primary-school.mjs'

try {
  console.log(JSON.stringify(await probeTaichungPrimarySchoolSource(), null, 2))
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
