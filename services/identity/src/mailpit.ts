export type MailpitConfig = {
  origin: URL;
  verificationPage: URL;
};

export function mailpitSender(config: MailpitConfig, request: typeof fetch = fetch) {
  const sendUrl = new URL("/api/v1/send", config.origin);

  return async (email: string, token: string): Promise<boolean> => {
    const link = new URL(config.verificationPage);
    link.hash = new URLSearchParams({ token }).toString();

    try {
      const response = await request(sendUrl, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          From: { Email: "noreply@badminton.local", Name: "Badminton System" },
          To: [{ Email: email }],
          Subject: "Xác minh email đăng ký Badminton System",
          Text: [
            "Mở đường dẫn sau để xác minh địa chỉ email của bạn.",
            link.href,
            "Đường dẫn có hiệu lực trong 24 giờ.",
          ].join("\n\n"),
        }),
      });
      await response.body?.cancel();
      return response.ok;
    } catch {
      return false;
    }
  };
}
