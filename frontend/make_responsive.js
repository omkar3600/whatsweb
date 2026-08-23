const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'landing');

fs.readdirSync(dir).forEach(file => {
  if (!file.endsWith('.tsx')) return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // Global replacements
  newContent = newContent.replace(/px-16/g, 'px-6 md:px-12 lg:px-16');
  newContent = newContent.replace(/py-24/g, 'py-16 lg:py-24');
  
  // Grid responsive replacements
  if (!newContent.includes('lg:grid-cols-2')) {
    newContent = newContent.replace(/grid-cols-2/g, 'grid-cols-1 lg:grid-cols-2');
  }
  if (!newContent.includes('md:grid-cols-3')) {
    newContent = newContent.replace(/grid-cols-3/g, 'grid-cols-1 md:grid-cols-3');
  }
  if (!newContent.includes('lg:grid-cols-4')) {
    newContent = newContent.replace(/grid-cols-4/g, 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
  }
  if (!newContent.includes('lg:grid-cols-5')) {
    newContent = newContent.replace(/grid-cols-5/g, 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5');
  }

  // Component Specific fixes

  if (file === 'NavBar.tsx') {
    // Hide links on mobile
    newContent = newContent.replace(/className="flex items-center gap-8"/g, 'className="hidden lg:flex items-center gap-8"');
    newContent = newContent.replace(/px-5 py-2.5/g, 'px-3 py-2 md:px-5 md:py-2.5'); // responsive button
    newContent = newContent.replace(/text-sm font-body text-foreground font-medium/g, 'hidden sm:block text-sm font-body text-foreground font-medium'); // hide Sign In text on super small screens or keep it
  }

  if (file === 'HeroSection.tsx') {
    // text-6xl -> text-4xl md:text-5xl lg:text-6xl
    newContent = newContent.replace(/text-6xl/g, 'text-4xl md:text-5xl lg:text-6xl');
    newContent = newContent.replace(/text-xl/g, 'text-lg md:text-xl');
    newContent = newContent.replace(/w-3\/4/g, 'w-full md:w-3/4');
    newContent = newContent.replace(/inline-flex items-center gap-2/g, 'inline-flex flex-wrap justify-center items-center gap-2'); // Badges wrapping
  }

  if (file === 'HowItWorksSection.tsx') {
    // Hide timeline line on mobile
    newContent = newContent.replace(/w-full absolute top-12 left-0 h-0.5/g, 'hidden lg:block w-full absolute top-12 left-0 h-0.5');
  }

  if (file === 'ProblemSolutionSection.tsx') {
    newContent = newContent.replace(/flex flex-col md:flex-row/g, 'flex flex-col lg:flex-row');
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log('Updated ' + file);
  }
});
