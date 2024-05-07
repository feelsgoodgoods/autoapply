const { execSync } = require('child_process');

console.log('CONVERTING TEX')
try {
  execSync('pdflatex -interaction=nonstopmode ./resume.tex', { stdio: 'inherit' });
  console.log('PDF generated!');
} catch (error) {
  console.error('Error generating PDF:', error);
}
