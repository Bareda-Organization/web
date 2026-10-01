import styled from "@emotion/styled";

export const StyledDialogForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const StyledConfirmBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--fs-body-sm);
  color: var(--text-primary);
`;

export const StyledAddressPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--fs-body-sm);
  color: var(--text-primary);
`;

export const StyledAddressHint = styled.p`
  margin: 0;
  font-size: var(--fs-micro);
  color: var(--text-secondary);
`;
