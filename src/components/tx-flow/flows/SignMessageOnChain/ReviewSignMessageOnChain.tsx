import type { ReactElement } from 'react'
import { useContext, useEffect } from 'react'
import { useMemo } from 'react'
import { hashMessage, Interface, _TypedDataEncoder } from 'ethers/lib/utils'
import { Box } from '@mui/system'
import { Typography, SvgIcon } from '@mui/material'
import WarningIcon from '@/public/images/notifications/warning.svg'
import { type EIP712TypedData, isObjectEIP712TypedData, Methods, type RequestId } from '@safe-global/safe-apps-sdk'
import { OperationType } from '@safe-global/safe-core-sdk-types'

import SendFromBlock from '@/components/tx/SendFromBlock'
import { InfoDetails } from '@/components/transactions/InfoDetails'
import EthHashInfo from '@/components/common/EthHashInfo'
import SignOrExecuteForm from '@/components/tx/SignOrExecuteForm'
import { generateDataRowValue } from '@/components/transactions/TxDetails/Summary/TxDataRow'
import useChainId from '@/hooks/useChainId'
import { getSignMessageLibContractDeployment } from '@/services/contracts/safeContracts'
import { DecodedMsg } from '@/components/safe-messages/DecodedMsg'
import CopyButton from '@/components/common/CopyButton'
import { getDecodedMessage } from '@/components/safe-apps/utils'
import { createTx, dispatchSafeAppsTx } from '@/services/tx/tx-sender'
import useOnboard from '@/hooks/wallets/useOnboard'
import useSafeInfo from '@/hooks/useSafeInfo'
import useHighlightHiddenTab from '@/hooks/useHighlightHiddenTab'
import { type SafeAppData } from '@safe-global/safe-gateway-typescript-sdk'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { asError } from '@/services/exceptions/utils'

export type SignMessageOnChainProps = {
  appId?: number
  app?: SafeAppData
  requestId: RequestId
  message: string | EIP712TypedData
  method: Methods.signMessage | Methods.signTypedMessage
}

const ReviewSignMessageOnChain = ({ message, method, requestId }: SignMessageOnChainProps): ReactElement => {
  const chainId = useChainId()
  const { safe } = useSafeInfo()
  const onboard = useOnboard()
  const { safeTx, setSafeTx, setSafeTxError } = useContext(SafeTxContext)

  useHighlightHiddenTab()

  const isTextMessage = method === Methods.signMessage && typeof message === 'string'
  const isTypedMessage = method === Methods.signTypedMessage && isObjectEIP712TypedData(message)

  const signMessageLibContract = useMemo(() => {
    return getSignMessageLibContractDeployment(chainId)
  }, [chainId])

  const [decodedMessage, readableMessage] = useMemo(() => {
    if (isTextMessage) {
      const decoded = getDecodedMessage(message)
      return [decoded, decoded]
    } else if (isTypedMessage) {
      return [message, JSON.stringify(message, null, 2)]
    }
    return []
  }, [isTextMessage, isTypedMessage, message])

  useEffect(() => {
    if (!signMessageLibContract) {
      return
    }

    let txData

    const signMessageLibInterface = new Interface(signMessageLibContract.abi)

    if (isTextMessage) {
      txData = signMessageLibInterface.encodeFunctionData('signMessage', [hashMessage(getDecodedMessage(message))])
    } else if (isTypedMessage) {
      const typesCopy = { ...message.types }

      // We need to remove the EIP712Domain type from the types object
      // Because it's a part of the JSON-RPC payload, but for the `.hash` in ethers.js
      // The types are not allowed to be recursive, so ever type must either be used by another type, or be
      // the primary type. And there must only be one type that is not used by any other type.
      delete typesCopy.EIP712Domain
      txData = signMessageLibInterface.encodeFunctionData('signMessage', [
        _TypedDataEncoder.hash(message.domain, typesCopy, message.message),
      ])
    }

    const params = {
      to: signMessageLibContract.networkAddresses[chainId],
      value: '0',
      data: txData || '0x',
      operation: OperationType.DelegateCall,
    }
    createTx(params).then(setSafeTx).catch(setSafeTxError)
  }, [isTextMessage, isTypedMessage, message, signMessageLibContract, setSafeTx, setSafeTxError, chainId])

  const handleSubmit = async () => {
    if (!safeTx || !onboard) return
    try {
      await dispatchSafeAppsTx(safeTx, requestId, onboard, safe.chainId)
    } catch (error) {
      setSafeTxError(asError(error))
    }
  }

  return (
    <SignOrExecuteForm onSubmit={handleSubmit}>
      <SendFromBlock />

      <InfoDetails title="Interact with SignMessageLib">
        <EthHashInfo
          address={signMessageLibContract?.networkAddresses[chainId] || ''}
          shortAddress={false}
          showCopyButton
          hasExplorer
        />
      </InfoDetails>

      {safeTx && (
        <Box pb={1}>
          <Typography mt={2} color="primary.light">
            Data (hex encoded)
          </Typography>
          {generateDataRowValue(safeTx.data.data, 'rawData')}
        </Box>
      )}

      <Typography my={1}>
        <b>Signing method:</b> <code>{method}</code>
      </Typography>

      <Typography my={2}>
        <b>Signing message:</b> {readableMessage && <CopyButton text={readableMessage} />}
      </Typography>
      <DecodedMsg message={decodedMessage} isInModal />

      <Box display="flex" alignItems="center" my={2}>
        <SvgIcon component={WarningIcon} inheritViewBox color="warning" />
        <Typography ml={1}>
          Signing a message with your Safe Account requires a transaction on the blockchain
        </Typography>
      </Box>
    </SignOrExecuteForm>
  )
}

export default ReviewSignMessageOnChain
