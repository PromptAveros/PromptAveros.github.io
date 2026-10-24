import { isDemoContent } from "@/lib/content";

export function DemoNotice() {
  return isDemoContent ? <div className="demo-note">Demonstration content is shown. Connect Neon and rebuild to publish your own library.</div> : null;
}
