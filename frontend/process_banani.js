const fs = require('fs');
const path = require('path');
const src = 'C:/Users/omkar/.gemini/antigravity/brain/04b5b188-4a75-45cd-b50d-f91a1e12c3b3/scratch/banani_components';
const dest = 'd:/Salescope/WhatsHub/frontend/src/components/landing';

fs.readdirSync(src).filter(f => f.endsWith('.jsx')).forEach(f => {
  let content = fs.readFileSync(path.join(src, f), 'utf-8');
  content = content.replace(/@components\//g, './').replace(/@global\//g, '../ui/');
  
  if (content.includes('t(')) {
    content = 'const t = (s) => s;\n' + content;
  }
  
  if (f === 'NavBar.jsx') {
    content = content.replace(/<a className="text-sm font-body text-foreground font-medium">\{t\('Sign In'\)\}<\/a>/g, '<a href="/login" className="text-sm font-body text-foreground font-medium">{t(\'Sign In\')}</a>');
    content = content.replace(/<button className="bg-primary(.*?)>\{t\('Book Demo'\)\}<\/button>/g, '<a href="/register" className="bg-primary inline-flex items-center justify-center$1>{t(\'Book Demo\')}</a>');
  }
  
  if (f === 'CTASection.jsx') {
    content = content.replace(/<button className="(.*?)>[\s\S]*?\{t\('Book Demo'\)\}[\s\S]*?<\/button>/g, '<a href="/register" className="$1><Icon i="calendar" size={17} />{t(\'Book Demo\')}</a>');
    content = content.replace(/<a className="font-medium(.*?)>[\s\S]*?\{t\('Login'\)\}[\s\S]*?<\/a>/g, '<a href="/login" className="font-medium$1><Icon i="log-in" size={17} />{t(\'Login\')}</a>');
  }
  
  if (f === 'WhatsHubLanding.jsx') {
    content = content.replace(/export default \(\) => \(/g, 'export default function WhatsHubLanding() { return (');
    content = content.replace(/;\n$/g, ';}');
  }
  
  fs.writeFileSync(path.join(dest, f.replace('.jsx', '.tsx')), content);
});
console.log('Processed jsx to tsx');
