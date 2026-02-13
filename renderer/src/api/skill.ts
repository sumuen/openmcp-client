import { useMessageBridge } from "./message-bridge";

export interface SkillContent {
    name: string;
    description: string;
    body: string;
    skillDir: string;
    references: string[];
}

export interface SkillMetadata {
    name: string;
    description: string;
    dirName?: string;
}

export async function listSkills(): Promise<SkillMetadata[]> {
    const bridge = useMessageBridge();
    const { code, msg } = await bridge.commandRequest<{ skills: SkillMetadata[] }>('skills/list');
    if (code !== 200 || !msg?.skills) {
        return [];
    }
    return msg.skills;
}

export async function loadSkillContent(skillName?: string): Promise<SkillContent | null> {
    const bridge = useMessageBridge();
    const { code, msg } = await bridge.commandRequest<SkillContent | null>('skills/load', { skillName });
    if (code !== 200 || !msg) {
        return null;
    }
    return msg;
}

export async function readSkillFile(skillName: string, filePath: string): Promise<{ isError: boolean; content: Array<{ type: string; text: string }> }> {
    const bridge = useMessageBridge();
    const { code, msg } = await bridge.commandRequest<{ isError: boolean; content: Array<{ type: string; text: string }> }>('skills/read-file', {
        skill_name: skillName,
        file_path: filePath
    });
    if (code !== 200) {
        return { isError: true, content: [{ type: 'error', text: String(msg) }] };
    }
    return msg;
}

export const READ_SKILL_FILE_TOOL = {
    type: 'function',
    function: {
        name: 'read_skill_file',
        description: 'Read a referenced file from the loaded skill for progressive disclosure. Use when the skill content says "see reference.md", "see examples.md", or points to other files. Only call when you need the detailed content to proceed.',
        parameters: {
            type: 'object',
            properties: {
                skill_name: { type: 'string', description: 'The skill name (from the loaded skill)' },
                file_path: { type: 'string', description: 'Relative path: reference.md, examples.md, or scripts/xxx' }
            },
            required: ['skill_name', 'file_path']
        }
    }
};
