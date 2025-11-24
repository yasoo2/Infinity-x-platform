
import cheerio from 'cheerio';

/**
 * @fileoverview SEO Analysis Tool for the JOE AGI system.
 * Conforms to the dynamic tool-manager service standard.
 */

/**
 * Analyzes the SEO of a given HTML content.
 * @param {{htmlContent: string}} args - The arguments object.
 * @param {string} args.htmlContent - The HTML content of the page to analyze.
 * @returns {Promise<object>} A promise that resolves to an object containing the SEO analysis report.
 */
async function seoBooster({ htmlContent }) {
  if (!htmlContent) {
    return {
      error: 'HTML content is empty or not provided.',
      score: 0,
      report: [],
    };
  }

  const $ = cheerio.load(htmlContent);
  const report = [];
  let score = 0;

  // 1. Title Tag Analysis (25 points)
  const title = $('title').text().trim();
  if (title) {
    if (title.length > 10 && title.length < 70) {
        report.push({ check: 'Title Tag', status: 'Pass', details: `Optimal length (${title.length} chars).` });
        score += 25;
    } else {
        report.push({ check: 'Title Tag', status: 'Fail', details: `Suboptimal length (${title.length} chars). Ideal is 10-70.` });
    }
  } else {
    report.push({ check: 'Title Tag', status: 'Fail', details: 'No <title> tag found.' });
  }

  // 2. Meta Description Analysis (25 points)
  const description = $('meta[name="description"]').attr('content');
  if (description) {
    if (description.length > 70 && description.length < 160) {
        report.push({ check: 'Meta Description', status: 'Pass', details: `Optimal length (${description.length} chars).` });
        score += 25;
    } else {
        report.push({ check: 'Meta Description', status: 'Fail', details: `Suboptimal length (${description.length} chars). Ideal is 70-160.` });
    }
  } else {
    report.push({ check: 'Meta Description', status: 'Fail', details: 'No <meta name="description"> tag found.' });
  }

  // 3. H1 Tag Analysis (25 points)
  const h1s = $('h1');
  if (h1s.length === 1) {
    report.push({ check: 'H1 Tag', status: 'Pass', details: `Exactly one <h1> tag found.` });
    score += 25;
  } else {
    report.push({ check: 'H1 Tag', status: 'Fail', details: `Found ${h1s.length} <h1> tags. There should be only one.` });
  }

  // 4. Image Alt Attributes Analysis (25 points)
  const images = $('img');
  const imagesWithoutAlt = images.filter((i, el) => !$(el).attr('alt') || $(el).attr('alt').trim() === '').length;
  if (images.length > 0 && imagesWithoutAlt === 0) {
      report.push({ check: 'Image Alt Texts', status: 'Pass', details: `All ${images.length} image(s) have alt attributes.` });
      score += 25;
  } else if (imagesWithoutAlt > 0) {
      report.push({ check: 'Image Alt Texts', status: 'Fail', details: `${imagesWithoutAlt} of ${images.length} image(s) are missing alt attributes.` });
  } else {
      report.push({ check: 'Image Alt Texts', status: 'Info', details: 'No images found. Adding points for not having bad practices.' });
      score += 25; // Assume good practice if no images are used
  }

  return {
    finalScore: score,
    analysis: report,
  };
}

seoBooster.metadata = {
    name: "seoBooster",
    description: "Analyzes a string of HTML content for Search Engine Optimization (SEO) best practices. It checks for the presence and quality of title tags, meta descriptions, H1 tags, and image alt attributes, then returns a score out of 100 and a detailed report.",
    parameters: {
        type: "object",
        properties: {
            htmlContent: {
                type: "string",
                description: "The full HTML content of the web page to be analyzed.",
            },
        },
        required: ["htmlContent"],
    },
};

export default { seoBooster };
