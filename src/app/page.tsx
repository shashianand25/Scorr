import { AppShell } from "@/components/app-shell";

const sampleQst = `@title: Biology Quiz
@time_limit: 30
@shuffle: true
@category: Science
@tags: biology, cells, exam-ready

# Markdown, KaTeX and image URLs are supported.
? Which organelle is the **powerhouse** of the cell?
+ Mitochondria
- Ribosome
- Golgi apparatus
- Chloroplast

? Select prime numbers
+ 2
+ 3
- 4
- 9

? The equation $E = mc^2$ was popularized by Einstein.
+ True
- False

? DNA stands for?
+ Deoxyribonucleic acid
- Deoxyribose nucleic acid
- Diribonucleic acid
- Double nucleic acid

? Which gas do plants absorb from the atmosphere for photosynthesis?
+ Carbon dioxide
- Oxygen
- Nitrogen
- Hydrogen`;


export default function Home() {
  return <AppShell initialQst={sampleQst} />;
}
