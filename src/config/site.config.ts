export interface SiteConfig {
  avatar: string;
  github: string;
  shortAbout: string;
  skills: SkillType[];
}

interface SkillType {
  title: string;
  tags: {
    name: string;
    url?: string;
  }[];
}

export default {
  avatar: 'https://r2.oss.isyuah.top/avatar.jpeg',
  github: 'https://github.com/isyuah',
  shortAbout: `一个前端开发人员，喜欢用 Vue
  
略懂 TypeScript / JavaScript / React

喜欢尝试新东西，短暂学过 Rust，最近在研究 Astro
`,
  skills: [{
    title: '前端',
    tags: [
      { name: 'HTML', url: "https://html.spec.whatwg.org/" },
      { name: 'CSS' },
      { name: 'JavaScript' },
      { name: 'TypeScript' },
      { name: 'React' },
      { name: 'Vue' },
    ],
  },{
    title: '后端',
    tags: [{
      name: 'Node.js',
    },{
      name: 'Rust',
    },{
      name: 'C#',
    }]
  }]
} satisfies SiteConfig