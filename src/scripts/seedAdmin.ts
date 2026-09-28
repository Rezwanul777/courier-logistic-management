import "dotenv/config";
import { prisma } from "../app/lib/prisma";
import { seedAdmin } from "../app/utils/seed";

async function main(): Promise<void> {
	try {
		await seedAdmin();
	} catch {
		// Keep connection details and input values out of terminal logs.
		console.error(
			"Admin seed failed. Check admin env values, database connection, applied migrations, and whether ADMIN_EMAIL is already used by an incompatible account.",
		);
		process.exitCode = 1;
	} finally {
		await prisma.$disconnect();
	}
}
void main().catch(() => {
	console.error("Admin seed cleanup failed.");
	process.exitCode = 1;
});
