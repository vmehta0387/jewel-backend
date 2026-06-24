type AddressLike = {
  streetAddress?: string | null;
  streetAddress2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export function formatAddressLocation(address: AddressLike): string {
  const parts = [
    address.streetAddress,
    address.streetAddress2,
    address.city,
    address.stateProvince,
    address.postalCode,
    address.country,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : '-';
}
