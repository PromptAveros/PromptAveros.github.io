import { isDemoContent } from "@/lib/content";

export function DemoNotice() {
  return isDemoContent ? <div className="demo-note">Demonstration content is shown. Publish a prompt in Supabase and rebuild to replace these examples with your library.</div> : null;
}
