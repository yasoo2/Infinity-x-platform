
import { runtimeEvolutionService } from './backend/src/services/evolution/runtime-evolution.service.mjs';

// This script runs the analysis and suggestion part of the evolution cycle
// to verify the changes made in the previous step.
async function verifyEvolution() {
    console.log('🕵️  Verifying evolution... Running analysis and suggestion engine.');
    try {
        const result = await runtimeEvolutionService.identifyImprovements();
        if (result.success) {
            console.log('✅ Verification complete. New improvement suggestions:');
            console.log(JSON.stringify(result.improvements, null, 2));
        } else {
            console.error('❌ Verification failed:', result.error);
        }
    } catch (e) {
        console.error('❌ An unexpected error occurred during verification:', e);
    }
}

verifyEvolution();
