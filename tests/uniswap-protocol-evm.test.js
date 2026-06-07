import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import UniswapProtocolEvm from '../index.js'

describe('UniswapProtocolEvm', () => {
  let account,
      protocol

  beforeEach(() => {
    account = {
      sendTransaction: jest.fn()
    }

    protocol = new UniswapProtocolEvm(account)
  })

  describe('swap', () => {
    test.todo('should successfully perform a swap operation (buy)')

    test.todo('should successfully perform a swap operation (sell)')

    test.todo('should throw if the swap fee exceeds the swap max fee configuration')

    test.todo('should throw if the account is read-only')

    test.todo('should throw if the account is not connected to a provider')
  })

  describe('quoteSwap', () => {
    test.todo('should successfully quote a swap operation (buy)')

    test.todo('should successfully quote a swap operation (sell)')

    test.todo('should throw if the account is not connected to a provider')
  })
})
