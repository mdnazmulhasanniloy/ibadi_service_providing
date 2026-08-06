import config from '@app/config/index.js';
import agoraToken from 'agora-access-token';

const { RtcTokenBuilder, RtcRole } = agoraToken;

export function generateAgoraToken(channelName: string, uid: number) {
  const appId = config.agora.appId;
  const appCertificate = config.agora.appCertificate;
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600; // 1 hour
  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  return RtcTokenBuilder.buildTokenWithUid(
    appId as string,
    appCertificate as string,
    channelName,
    uid,
    role,
    privilegeExpireTime,
  );
}
