import {getSubscriberDetails} from './lookup';
import {createSigningString, verifyMessage} from './crypto';
import {SubscriberDetail} from '../types';

const remove_quotes = (value: string) => {
  if (
    value.length >= 2 &&
    value.charAt(0) === '"' &&
    value.charAt(value.length - 1) === '"'
  ) {
    value = value.substring(1, value.length - 1);
  }
  return value;
};

export const split_auth_header = (auth_header: string) => {
  const header = auth_header.replace('Signature ', '');
  const re = /\s*([^=]+)=([^,]+)[,]?/g;
  let m;
  const parts: any = {};
  while ((m = re.exec(header)) !== null) {
    if (m) {
      parts[m[1]] = remove_quotes(m[2]);
    }
  }
  return parts;
};

export async function verifyHeader(
  header: string,
  rawBody: string
): Promise<boolean> {
  try {
    const parts = split_auth_header(header);
    if (!parts || Object.keys(parts).length === 0) {
      return false;
    }

    const subscriber_id = parts['keyId'].split('|')[0];
    const unique_key_id = parts['keyId'].split('|')[1];
    const subscribers_details = await getSubscriberDetails(
      subscriber_id,
      unique_key_id
    );

    for (const each of subscribers_details as SubscriberDetail[]) {
      const public_key = each.signing_public_key;
      const {signing_string} = await createSigningString(
        rawBody,
        parts['created'],
        parts['expires']
      );
      // console.log("NP Public Key", public_key)
      const verified = await verifyMessage(
        parts['signature'],
        signing_string,
        public_key
      );
      if (verified) return true;
    }
    return false;
  } catch (error) {
    console.log('ERROR:', error);
    return false;
  }
}
