import json
import re
import os

transcript_path = '/Users/shashi/.gemini/antigravity/brain/fcda6887-2f3e-4cc2-9414-b4c784ed82da/.system_generated/logs/transcript.jsonl'

diffs = []
current_diff = None
is_index = False

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            step = json.loads(line)
            # Stop if we reach the step where git checkout happened (step 1198)
            # Actually, I can just look at all CODE_ACTIONs before step 1198.
            if step.get('step_index', 0) > 1195:
                break
            
            if step.get('type') == 'CODE_ACTION' and step.get('content'):
                content = step['content']
                if 'mobile/src/app/index.tsx' in content:
                    # Extract diff block
                    if '[diff_block_start]' in content and '[diff_block_end]' in content:
                        diff_text = content.split('[diff_block_start]')[1].split('[diff_block_end]')[0].strip()
                        # Construct a valid unified diff header
                        # The original file has timestamp, we can just fake it
                        header = f"--- mobile/src/app/index.tsx\n+++ mobile/src/app/index.tsx\n"
                        full_diff = header + diff_text + "\n"
                        diffs.append(full_diff)
        except:
            pass

print(f"Found {len(diffs)} diffs for index.tsx")

with open('recovery.patch', 'w') as f:
    for d in diffs:
        f.write(d)
        f.write("\n")
