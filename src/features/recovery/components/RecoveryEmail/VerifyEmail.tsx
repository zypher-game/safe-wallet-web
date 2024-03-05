import { useAppDispatch } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { useState } from 'react'
import ErrorMessage from '@/components/tx/ErrorMessage'
import useRecoveryEmail from '@/features/recovery/components/RecoveryEmail/useRecoveryEmail'
import { Button, DialogActions, DialogContent, Typography, Stack, Link, Alert } from '@mui/material'
import CodeInput from '@/components/common/CodeInput'
import CooldownLink from 'src/components/common/CooldownLink'
import ModalDialog from '@/components/common/ModalDialog'

const CODE_LENGTH = 6

export const NotVerifiedMessage = ({ onVerify }: { onVerify: () => void }) => {
  return (
    <ErrorMessage level="border">
      <Typography fontWeight="bold">Email not verified</Typography>
      You didn&apos;t finish the verification yet. Once confirmed, it will be added as your notification email.{' '}
      <Link href="#" onClick={onVerify}>
        Verify email
      </Link>
    </ErrorMessage>
  )
}

const VerifyEmail = ({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) => {
  const [error, setError] = useState<string>()
  const [verificationCode, setVerificationCode] = useState<string>('')
  const { verifyEmailAddress, resendVerification, registerRecovery } = useRecoveryEmail()
  const dispatch = useAppDispatch()

  const handleRetry = async () => {
    try {
      await resendVerification()
      setError(undefined)
    } catch (e) {
      setError('Error requesting verification code. Please try again.')
    }
  }

  const handleVerify = async () => {
    try {
      setError(undefined)
      await verifyEmailAddress(verificationCode)
      dispatch(
        showNotification({
          variant: 'success',
          groupKey: 'verify-email-complete',
          message: 'Your email address is verified',
        }),
      )
      onSuccess()
      await registerRecovery()
    } catch (e) {
      setError('Wrong verification code. Try again.')
    }
  }

  const isDisabled = verificationCode.length < CODE_LENGTH

  return (
    <ModalDialog open dialogTitle="Verify your email address" onClose={onCancel} hideChainIndicator>
      <DialogContent>
        <Stack mt={2} direction="column" gap={2}>
          <Typography>Enter the 6-digit code that we sent to the email address you provided.</Typography>
          <CodeInput length={CODE_LENGTH} onCodeChanged={setVerificationCode} error={!!error} />
          <Typography>
            Didn&apos;t get the code?{' '}
            <CooldownLink onClick={handleRetry} cooldown={60}>
              Resend code
            </CooldownLink>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ border: 0 }}>
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleVerify} disabled={isDisabled}>
          Verify
        </Button>
      </DialogActions>
    </ModalDialog>
  )
}

export default VerifyEmail
