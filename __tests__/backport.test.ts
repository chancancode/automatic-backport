import {dir, DirectoryResult} from 'tmp-promise'
import {resolve} from 'path'
import assert from '../src/assert'
import Backport from '../src/backport'
import {Repository} from '../src/git'
import Mapping from '../src/mapping'

const MAPPING = Mapping.fromYAML(`
  "[BUGFIX beta]":    [beta]
  "[BUGFIX release]": [beta, release]
  "[BUGFIX lts]":     [beta, release, lts-3-16, lts-3-12]
  "[DOC beta]":       [beta]
  "[DOC release]":    [beta, release]
  "[DOC lts]":        [beta, release, lts-3-16, lts-3-12]
`)

let tmpdir: DirectoryResult
let cwd: string
let repo: Repository

beforeEach(async () => {
  repo = await Repository.import(resolve(__dirname, '..'))

  for (const branch of await repo.getBranches('fixtures/*', 'origin')) {
    if (!(await repo.hasBranch(branch))) {
      await repo.createBranch(branch, `remotes/origin/${branch}`)
    }
  }

  tmpdir = await dir({unsafeCleanup: true})
  cwd = process.cwd()
  process.chdir(tmpdir.path)
  repo = await Repository.init()

  await repo.addRemote('origin', resolve(__dirname, '..'))
})

afterEach(async () => {
  process.chdir(cwd)
  await tmpdir.cleanup()
})

describe('backport', () => {
  test('[BUGFIX release] PR #18958', async () => {
    /*
      commit 5a8c72a665dc71fb2167a70d64edccc67a7ddebf
      Author: Robert Jackson <rjackson@linkedin.com>
      Date:   Fri May 8 11:56:41 2020 -0400

          [BUGFIX release] Ensure AST transforms using `in-element` work properly.

          Prior to this, an AST transform that adds an `in-element` usage would
          fail subtly. This was fixed in
          https://github.com/glimmerjs/glimmer-vm/pull/1086.

      diff --git a/package.json b/package.json
      index d7433c7f4..6f8c3cff4 100644
      --- a/package.json
      +++ b/package.json
      @@ -74,15 +74,15 @@
        },
        "devDependencies": {
          "@babel/preset-env": "^7.9.5",
      -    "@glimmer/compiler": "^0.52.0",
      +    "@glimmer/compiler": "^0.52.1",
          "@glimmer/env": "^0.1.7",
      -    "@glimmer/interfaces": "^0.52.0",
      -    "@glimmer/node": "^0.52.0",
      -    "@glimmer/opcode-compiler": "^0.52.0",
      -    "@glimmer/program": "^0.52.0",
      -    "@glimmer/reference": "^0.52.0",
      -    "@glimmer/runtime": "^0.52.0",
      -    "@glimmer/validator": "^0.52.0",
      +    "@glimmer/interfaces": "^0.52.1",
      +    "@glimmer/node": "^0.52.1",
      +    "@glimmer/opcode-compiler": "^0.52.1",
      +    "@glimmer/program": "^0.52.1",
      +    "@glimmer/reference": "^0.52.1",
      +    "@glimmer/runtime": "^0.52.1",
      +    "@glimmer/validator": "^0.52.1",
          "@simple-dom/document": "^1.4.0",
          "@types/qunit": "^2.9.1",
          "@types/rsvp": "^4.0.3",
      diff --git a/packages/ember-template-compiler/lib/plugins/transform-in-element.ts b/packages/ember-template-compiler/lib/plugins/transform-in-element.ts
      index ea67fc9d7..5c17597cc 100644
      --- a/packages/ember-template-compiler/lib/plugins/transform-in-element.ts
      +++ b/packages/ember-template-compiler/lib/plugins/transform-in-element.ts
      @@ -45,7 +45,6 @@ import { isPath } from './utils';
      export default function transformInElement(env: ASTPluginEnvironment): ASTPlugin {
        let { moduleName } = env.meta as StaticTemplateMeta;
        let { builders: b } = env.syntax;
      -  let cursorCount = 0;

        return {
          name: 'transform-in-element',
      @@ -102,10 +101,6 @@ export default function transformInElement(env: ASTPluginEnvironment): ASTPlugin
                  }
                });

      -          let guid = b.literal('StringLiteral', `%cursor:${cursorCount++}%`);
      -          let guidPair = b.pair('guid', guid);
      -          hash.pairs.unshift(guidPair);
      -
                // Maintain compatibility with previous -in-element behavior (defaults to append, not clear)
                if (needsInsertBefore) {
                  let nullLiteral = b.literal('NullLiteral', null);
      diff --git a/yarn.lock b/yarn.lock
      index 120b1626b..9b6758ad0 100644
      --- a/yarn.lock
      +++ b/yarn.lock
      @@ -913,142 +913,142 @@
        resolved "https://registry.yarnpkg.com/@ember/edition-utils/-/edition-utils-1.2.0.tgz#a039f542dc14c8e8299c81cd5abba95e2459cfa6"
        integrity sha512-VmVq/8saCaPdesQmftPqbFtxJWrzxNGSQ+e8x8LLe3Hjm36pJ04Q8LeORGZkAeOhldoUX9seLGmSaHeXkIqoog==

      -"@glimmer/compiler@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/compiler/-/compiler-0.52.0.tgz#b376ee0e9cd45035689ab21e56f53f8e262b1ab9"
      -  integrity sha512-JiRPEBXCIPJNUzKL8baujPQw2PsKTBTU5hXm06tOguRj7YCNkAogLvcUEhVBmQ7SlmWL2TBe/rVzeZZ/xy+8Yw==
      -  dependencies:
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/syntax" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      -    "@glimmer/wire-format" "^0.52.0"
      +"@glimmer/compiler@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/compiler/-/compiler-0.52.1.tgz#23cc23691b52740f1e444d6675d2474aea6a0463"
      +  integrity sha512-vYM3XwuxdcqxQItlopckzgXx/Uo4Cv69rfaf6yE/CAw+xt+LUwUx4Ua7TbyWuJa7gBIK5d1DyxzYD7aspfklAQ==
      +  dependencies:
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/syntax" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
      +    "@glimmer/wire-format" "^0.52.1"
          "@simple-dom/interface" "^1.4.0"

      -"@glimmer/encoder@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/encoder/-/encoder-0.52.0.tgz#a972b45c13527e3c1f9c51eddaed748f52bd3d81"
      -  integrity sha512-XrHn6Pm6sVdeyTkz24zxOQ8R/GcEm/tNXFfQQalPIdTeZPannv/dmO5c83zs5jyUSWYnsQDUMC2X2Oy0Kwm0Hg==
      +"@glimmer/encoder@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/encoder/-/encoder-0.52.1.tgz#6ee8294c56b5a32926f4653849de0693d5062aa5"
      +  integrity sha512-4Nlb6PdB0Nm4S6UiJd5fDjJDRoRzmioqKDyauIccOw0e/E7aOY4/pg8qhdlkLOV+2btfZEY83puEdXibdmsSyQ==
        dependencies:
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/vm" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/vm" "^0.52.1"

      "@glimmer/env@0.1.7", "@glimmer/env@^0.1.7":
        version "0.1.7"
        resolved "https://registry.yarnpkg.com/@glimmer/env/-/env-0.1.7.tgz#fd2d2b55a9029c6b37a6c935e8c8871ae70dfa07"
        integrity sha1-/S0rVakCnGs3psk16MiHGucN+gc=

      -"@glimmer/interfaces@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/interfaces/-/interfaces-0.52.0.tgz#78231cb5b96a35ab634559919636e1a5f4b9b370"
      -  integrity sha512-qDj4yjxvqHQXWHu4Box9veVKoCNcQeQE5pIFZ+rEzJ1mqkh5wglmhLb9DYqjotrOPOH6D9vE50Nu1ICOAe9x/w==
      +"@glimmer/interfaces@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/interfaces/-/interfaces-0.52.1.tgz#a397af54d913caaaedfac5d0bd161358c1a50f57"
      +  integrity sha512-Sv1RGcvoIzu1dQBth6sB6LN7tI4qRiRZK3LzwsiYGgFllNPKC6aihrWQi+G/vKevwhzrjLgrnjCHR5uTw188mQ==
        dependencies:
          "@simple-dom/interface" "^1.4.0"

      -"@glimmer/low-level@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/low-level/-/low-level-0.52.0.tgz#73132561612d6d0cecfdfb6176774ac6d1290dc3"
      -  integrity sha512-uuSaVQGFUiC9Pbf2a3s29RzaW/29o7SP2gB3+mrJmYGFeP5rIXcR4fWGDhpecGjwopa+HNJBSGtpgcL9C2VbYg==
      +"@glimmer/low-level@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/low-level/-/low-level-0.52.1.tgz#8fa39f8abab0a3c211e8f0b699fad14d71456dbf"
      +  integrity sha512-caUt3pLhvEYM/o/Q+7SJig7/2SwWtl/dp39xP50OmEBxty4vKYYYvak/07rp+g3ZgQ0vmdYbShZH4NVLSQTTjA==

      -"@glimmer/node@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/node/-/node-0.52.0.tgz#6ea99ce8a2c92c9a9f302da743e003fbade79a51"
      -  integrity sha512-MO3nf3Vu5VakNbSTvUkEN2EgBYIeg6q5f050AhN5iB0/VIjgeU+BTX/r+qPHxHtxtImzmBW6RrXd2A+0abYISQ==
      +"@glimmer/node@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/node/-/node-0.52.1.tgz#297282751db4949cd00f599328ae63c2018e6dd5"
      +  integrity sha512-8NZ3Xy0yTR9ZkiyAeS+AhRG8RqyqP7c1TdfxcFzj/lp/cHidjAhfvqpZMjRQcKuFHYh890VdLvazDkcuy9jiTA==
        dependencies:
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/runtime" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/runtime" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
          "@simple-dom/document" "^1.4.0"
          "@simple-dom/interface" "^1.4.0"

      -"@glimmer/opcode-compiler@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/opcode-compiler/-/opcode-compiler-0.52.0.tgz#a7bdcbf3d3534e929af46863e0f8c901801942a8"
      -  integrity sha512-qghP5lHPTaXH9jyuHfwO9JAxLAbec96Q3G4/71sCJ5sUMDeyieXkaohj4i3C9a+3WCoQg6xHTl/0BVtp88Ddqw==
      -  dependencies:
      -    "@glimmer/encoder" "^0.52.0"
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/program" "^0.52.0"
      -    "@glimmer/reference" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      -    "@glimmer/vm" "^0.52.0"
      -    "@glimmer/wire-format" "^0.52.0"
      -
      -"@glimmer/program@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/program/-/program-0.52.0.tgz#8b1d265a51b0ebd3223ff28ebbf57ca20bebdd33"
      -  integrity sha512-nRTOeDa/qWxSKmVqIm3X1HBNWjZ26fx8Jj6KQTsety9V3T4YambYGN0GHoX5f1Qtg0yXQxzdGTU0AR9pNaOH7Q==
      -  dependencies:
      -    "@glimmer/encoder" "^0.52.0"
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      -
      -"@glimmer/reference@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/reference/-/reference-0.52.0.tgz#1d5e265ed5b434577bfbe8895dbbc9ebefe775b0"
      -  integrity sha512-8+vd9/CcVbRr0JVAOSxbeUHtVLtkgdbTPTGBOQkTU8lvUURGv+g/O1bQsYlQACPwU97KGKAiUo11+wHix3gQsg==
      +"@glimmer/opcode-compiler@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/opcode-compiler/-/opcode-compiler-0.52.1.tgz#0563bbbaacb95882ff28ae334a6579646e403e58"
      +  integrity sha512-h+dsnEdvtJmw0Sj/Q1Jbb+M5rhlvh9CQPuYMky3uSKrhwrJm07AqGfNpF+M9KOScL9OMf/dsY9itSTcr5X9tGQ==
      +  dependencies:
      +    "@glimmer/encoder" "^0.52.1"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/program" "^0.52.1"
      +    "@glimmer/reference" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
      +    "@glimmer/vm" "^0.52.1"
      +    "@glimmer/wire-format" "^0.52.1"
      +
      +"@glimmer/program@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/program/-/program-0.52.1.tgz#39b041463792dc1c6e441cf0ded5d04b951c2b2b"
      +  integrity sha512-rJhjdSTvBNMRi1f24Lakf3MNf7LVmZ/oP0Dp28YC46eoD4hwXirr5FidXUnDTDDz9z1ScKedudfAb8ZOK1U5TA==
      +  dependencies:
      +    "@glimmer/encoder" "^0.52.1"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
      +
      +"@glimmer/reference@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/reference/-/reference-0.52.1.tgz#47355e83dbbd5cbdc28e0f100800def6b723db72"
      +  integrity sha512-oX1QuaUBvRAcHsvYlM1eubIKJdhMhVU6QFpuEyImhto08ihTKiB2fAh14txDM+ub3eHFG30I/Yt5E1OZz3LqdA==
        dependencies:
          "@glimmer/env" "^0.1.7"
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      -    "@glimmer/validator" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
      +    "@glimmer/validator" "^0.52.1"

      -"@glimmer/runtime@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/runtime/-/runtime-0.52.0.tgz#51ddd363b20b2e8d4ac781ec2d5c5d9ca6937162"
      -  integrity sha512-9JpyjnZQl7cXRc8a3JS2wFEDEGO15r5GFzLRFuTSR1Cbncse/uSIg/kZINDmsow2jqFPycEOm0MkM4xYv7nD8Q==
      +"@glimmer/runtime@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/runtime/-/runtime-0.52.1.tgz#a11d95d4bb493a691eb4b68435a0f94ec0ce2582"
      +  integrity sha512-Jgq4IXNJUFrRldxw682+l1xoFrF1Z5etQSKfTzIPRg4y6llN+lR6LsDKxqdJu77SmilKfYPoEtYKTa3kPAesFA==
        dependencies:
          "@glimmer/env" "0.1.7"
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/low-level" "^0.52.0"
      -    "@glimmer/program" "^0.52.0"
      -    "@glimmer/reference" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      -    "@glimmer/validator" "^0.52.0"
      -    "@glimmer/vm" "^0.52.0"
      -    "@glimmer/wire-format" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/low-level" "^0.52.1"
      +    "@glimmer/program" "^0.52.1"
      +    "@glimmer/reference" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
      +    "@glimmer/validator" "^0.52.1"
      +    "@glimmer/vm" "^0.52.1"
      +    "@glimmer/wire-format" "^0.52.1"
          "@simple-dom/interface" "^1.4.0"

      -"@glimmer/syntax@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/syntax/-/syntax-0.52.0.tgz#11ef6103ca3d80a983aaaf879157638fe418c9cb"
      -  integrity sha512-PCpKK2SLOadGHiZDUZDX9UMXqfYyU5ZR7vUfomjqDdTK++0yiraGctM+MPaAV7AEXWyWSiy5mAs4oaK6/yYkkA==
      +"@glimmer/syntax@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/syntax/-/syntax-0.52.1.tgz#7817fcb67c366b96d6bf7e8c4f732ae172167339"
      +  integrity sha512-j5QdWiVDeNGIxz/dxE14olqc0tQB2ZI/wulCZca0fHhWWPukvQBl+8Hr0LOyo8NRrfxA7Y5z5ZAxnn8SwY5o0A==
        dependencies:
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"
          handlebars "^4.7.4"
          simple-html-tokenizer "^0.5.9"

      -"@glimmer/util@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/util/-/util-0.52.0.tgz#ff7c60213fded75621f97fabfcc2d19a556d003e"
      -  integrity sha512-kmfotPM0zzbRgaJ4vqreDv/qpX3rwV/I5L4GYYM5wa65NZwuLqh60CPFBtTcRLNC5itTCgJwkUA1t0AO9T0r7w==
      +"@glimmer/util@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/util/-/util-0.52.1.tgz#2689fe8c8a09742a5bc8c2abc0a9e0f9bfb28a42"
      +  integrity sha512-wVvFEjjUmK6H4ILl8FGldro8rRAYRxBVnWVkir9GHoLdW3x8vnvpKDQIopOAOJy5QO5Nk3mgSeIz7oMerIonlw==
        dependencies:
          "@glimmer/env" "0.1.7"
      -    "@glimmer/interfaces" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
          "@simple-dom/interface" "^1.4.0"

      -"@glimmer/validator@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/validator/-/validator-0.52.0.tgz#988e4478bcb32f1094a37e8efe4d05d6fe4f1668"
      -  integrity sha512-IGbX9lysnUoQjQ5Yf1IGbUDUJnl9vSQXaCLVWN7yeirAh+1WttOqXxLnP3cBapWaItgDHBctxPI65Vxu4G+HnA==
      +"@glimmer/validator@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/validator/-/validator-0.52.1.tgz#4f4e7dba2ec9d550209f6b6bac06fd90d8d6ead0"
      +  integrity sha512-Fv8zpzewjzii5yIraJdwxx/dQr65Km9sEfpBBYJ4Rn1cgx0ywvmfKNfJGicJw+MY8SpYAwd/ZdnBaojVOcO+ww==
        dependencies:
          "@glimmer/env" "^0.1.7"

      -"@glimmer/vm@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/vm/-/vm-0.52.0.tgz#472458d5bbe86ca789d8962909aac1f43b4d305b"
      -  integrity sha512-QLUO3nICn9LaWUEWCs7fb8FTv/Q1Op4hSCfUJ+EllMAgBoihBmjTdd7StseZnt1o4qVUKzrJ2yQSx6TPiFDnrw==
      +"@glimmer/vm@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/vm/-/vm-0.52.1.tgz#2937795d5f21f81f2bfb9762e14966b886498777"
      +  integrity sha512-hTi4SVBhRy42SQcPVPIj8CdTU0edS59KSA+3FIkgHl69iXKzrrTSqG7N2Q0PN0AoSMFlyOj/jdZQx5ElIUZACw==
        dependencies:
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"

      -"@glimmer/wire-format@^0.52.0":
      -  version "0.52.0"
      -  resolved "https://registry.yarnpkg.com/@glimmer/wire-format/-/wire-format-0.52.0.tgz#2677a3c13953c16fd62fc17e3420d2b96b513644"
      -  integrity sha512-wzCoqwxLEnZh6F4uId2e37Pv4M3zB1vK/GMoUAlE2hglxoZ9GsYpJBTzZv+b8EsNNmkbRDg5TTIV2MRolEGJpA==
      +"@glimmer/wire-format@^0.52.1":
      +  version "0.52.1"
      +  resolved "https://registry.yarnpkg.com/@glimmer/wire-format/-/wire-format-0.52.1.tgz#8c226a28df1e3063ecc0fba5d8f06563b35df59f"
      +  integrity sha512-ycsoxcwOfvqxAX+T9OR0Ldz9lwFO2AZifVT3x34D+4rR2Rjw5GOsrMBDHNSfiga3/cBrlryEPsnXWcVzbZyV8A==
        dependencies:
      -    "@glimmer/interfaces" "^0.52.0"
      -    "@glimmer/util" "^0.52.0"
      +    "@glimmer/interfaces" "^0.52.1"
      +    "@glimmer/util" "^0.52.1"

      "@simple-dom/document@^1.4.0":
        version "1.4.0"
    */

    await repo.fetch('origin', null, '--tags', '--depth=1')
    await repo.fetch('origin', 'fixtures/emberjs/pr-18958', '--depth=10')

    await repo.createBranch('master', 'fixtures/emberjs/pr-18958')
    await repo.createBranch('beta', 'fixtures/emberjs/v3.19.0-beta.3')
    await repo.createBranch('release', 'fixtures/emberjs/v3.18.1')

    const commits = await repo.getCommitsInRange('master~', 'master')

    const backport = new Backport(repo, commits, MAPPING)

    expect(backport.plan.size).toBe(2)
    expect(backport.plan.get('beta')).toEqual([commits[0]])
    expect(backport.plan.get('release')).toEqual([commits[0]])

    const result = await backport.execute()

    expect(result.size).toBe(2)

    const beta = result.get('beta')

    assert(beta)
    expect(beta.isSuccessful).toBe(false)
    expect(beta.clean).toEqual([])
    expect(beta.conflict).toEqual([commits[0]])
    expect(beta.empty).toEqual([])
    expect(beta.resultBranch).not.toBe('beta')

    let head = await repo.getCommit(beta.resultBranch)

    await expect(repo.getCommit('beta')).resolves.not.toEqual(head)

    expect(head.message).toMatch(
      `(cherry picked from commit ${commits[0].sha})`
    )

    expect(head.message).toMatch('# Conflicts:')

    let content = await repo.readFile('package.json', head.sha)

    expect(content).toMatch('<<<<<<< HEAD')
    expect(content).toMatch('"@glimmer/compiler": "^0.52.0",')
    expect(content).toMatch('"@glimmer/compiler": "^0.52.1",')

    const release = result.get('release')

    assert(release)
    expect(release.isSuccessful).toBe(true)
    expect(release.clean).toEqual([commits[0]])
    expect(release.conflict).toEqual([])
    expect(release.empty).toEqual([])
    expect(release.resultBranch).toBe('release')

    head = await repo.getCommit('release')

    expect(head.message).toMatch(
      `(cherry picked from commit ${commits[0].sha})`
    )

    expect(head.message).not.toMatch('# Conflicts:')

    content = await repo.readFile('package.json', head.sha)

    expect(content).not.toMatch('<<<<<<< HEAD')
    expect(content).not.toMatch('"@glimmer/compiler": "^0.52.0",')
    expect(content).toMatch('"@glimmer/compiler": "^0.52.1",')
  })
})
