import styled from "@emotion/styled";

export const StyledDialogForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const StyledDialogFormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const StyledStaffAccountList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-body-sm);
  color: var(--text-secondary);
`;
