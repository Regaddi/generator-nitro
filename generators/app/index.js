'use strict';

/* eslint-disable max-len, complexity, no-else-return, require-jsdoc */

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const request = require('request');
const path = require('path');
const fs = require('fs');
const Admzip = require('adm-zip');
const glob = require('glob');
const _ = require('lodash');

module.exports = class extends Generator {

	constructor(args, opts) {
		// Calling the super constructor
		super(args, opts);

		this._pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));

		this._passedInOptions = {
			name: this.options.name,
			pre: this.options.pre,
			js: this.options.js,
			viewExt: this.options.viewExt,
			clientTpl: this.options.clientTpl,
			exampleCode: this.options.exampleCode,
			exporter: this.options.exporter,
			release: this.options.release,
		};

		this.option('name', {
			desc: 'the name of your app',
			type: String,
			defaults: this._passedInOptions.name || path.basename(process.cwd()),
		});
		this.options.name = _.kebabCase(this.options.name);

		this._preOptions = ['less', 'scss'];
		this.option('pre', {
			desc: `your desired preprocessor [${this._preOptions.join('|')}]`,
			type: String,
			defaults: this._passedInOptions.pre || this._preOptions[1],
		});

		this._jsOptions = ['JavaScript', 'TypeScript'];
		this.option('js', {
			desc: `your desired js compiler [${this._jsOptions.join('|')}]`,
			type: String,
			defaults: this._passedInOptions.js || this._jsOptions[0],
		});

		this._viewExtOptions = ['html', 'hbs', 'mustache'];
		this.option('viewExt', {
			desc: `your desired view file extension [${this._viewExtOptions.join('|')}]`,
			type: String,
			defaults: this._passedInOptions.viewExt || this._viewExtOptions[1],
		});

		this.option('clientTpl', {
			desc: 'do you need client side templates',
			type: Boolean,
			defaults: this._passedInOptions.clientTpl || false,
		});

		this.option('exampleCode', {
			desc: 'do you want to include the example code',
			type: Boolean,
			defaults: this._passedInOptions.exampleCode || false,
		});

		this.option('exporter', {
			desc: 'do you need static exporting functionalities',
			type: Boolean,
			defaults: this._passedInOptions.exporter || false,
		});

		this.option('release', {
			desc: 'do you need release management',
			type: Boolean,
			defaults: this._passedInOptions.release || false,
		});

		this.option('skipQuestions', {
			desc: 'use default for not specified options and skip questions',
			type: Boolean,
			defaults: false,
		});

		this._skipQuestions = this.options.skipQuestions;
	}

	initializing() {
		// namics frontend-defaults
		this.srcZip = 'http://github.com/namics/frontend-defaults/archive/master.zip';
		this.destZip = this.templatePath('frontend-defaults.zip');
	}

	prompting() {

		this.log(yosay(
			`Welcome to the awe-inspiring ${chalk.cyan('Nitro')} generator!`
		));

		// check whether there is already a nitro application in place and we only have to update the application
		const json = this.fs.readJSON(this.destinationPath('package.json'), { defaults: { 'new': true } });

		if (!json.new && _.indexOf(json.keywords, 'nitro') !== -1) {
			// update existing application
			return this.prompt([
				{
					name: 'update',
					type: 'confirm',
					message: `There is already a ${chalk.cyan('Nitro')} application in place! Should I serve you an update?`,
					default: true,
				},
			]).then((answers) => {
				this._update = answers.update;

				if (!this._update) {
					return;
				}

				const config = this.config.getAll();
				if (config) {
					this.options.name = config.name || this.options.name;
					this.options.pre = config.preprocessor || this.options.pre;
					this.options.js = config.jscompiler || this.options.js;
					this.options.viewExt = config.viewExtension || this.options.viewExt;
					this.options.clientTpl = typeof config.clientTemplates === 'boolean' ? config.clientTemplates : this.options.clientTpl;
					this.options.exampleCode = typeof config.exampleCode === 'boolean' ? config.exampleCode : this.options.exampleCode;
					this.options.exporter = typeof config.exporter === 'boolean' ? config.exporter : this.options.exporter;
					this.options.release = typeof config.release === 'boolean' ? config.release : this.options.release;
				}
			});
		} else {
			// create new application
			return this.prompt([
				{
					name: 'name',
					message: 'What\'s the name of your app?',
					default: this.options.name,
					when: () => !this._skipQuestions && !this._passedInOptions.name,
				},
				{
					name: 'pre',
					type: 'list',
					message: 'What\'s your desired preprocessor?',
					choices: this._preOptions,
					default: this.options.pre,
					store: true,
					when: () => !this._skipQuestions && !this._passedInOptions.pre,
				},
				/* {
					name: 'js',
					type: 'list',
					message: 'What\'s your desired javascript compiler?',
					choices: this._jsOptions,
					default: this.options.js,
					store: true,
					when: () => !this._skipQuestions && !this._passedInOptions.js,
				},*/
				{
					name: 'viewExt',
					type: 'list',
					message: 'What\'s your desired view file extension?',
					choices: this._viewExtOptions,
					default: this.options.viewExt,
					store: true,
					when: () => !this._skipQuestions && !this._passedInOptions.viewExt,
				},
				{
					name: 'clientTpl',
					type: 'confirm',
					message: 'Would you like to include client side templates?',
					default: this.options.clientTpl,
					store: true,
					when: () => !this._skipQuestions && typeof this._passedInOptions.clientTpl !== 'boolean',
				},
				{
					name: 'exampleCode',
					type: 'confirm',
					message: 'Would you like to include the example code?',
					default: this.options.exampleCode,
					store: true,
					when: () => !this._skipQuestions && typeof this._passedInOptions.exampleCode !== 'boolean',
				},
				{
					name: 'exporter',
					type: 'confirm',
					message: 'Would you like to include static exporting functionalities?',
					default: this.options.exporter,
					store: true,
					when: () => !this._skipQuestions && typeof this._passedInOptions.exporter !== 'boolean',
				},
				{
					name: 'release',
					type: 'confirm',
					message: 'Would you like to include release management?',
					default: this.options.release,
					store: true,
					when: () => !this._skipQuestions && typeof this._passedInOptions.release !== 'boolean',
				},
			]).then((answers) => {
				this.options.name = answers.name || this.options.name;
				this.options.pre = answers.pre || this.options.pre;
				this.options.js = answers.js || this.options.js;
				this.options.viewExt = answers.viewExt || this.options.viewExt;
				this.options.clientTpl = answers.clientTpl !== undefined ? answers.clientTpl : this.options.clientTpl;
				this.options.exampleCode = answers.exampleCode !== undefined ? answers.exampleCode : this.options.exampleCode;
				this.options.exporter = answers.exporter !== undefined ? answers.exporter : this.options.exporter;
				this.options.release = answers.release !== undefined ? answers.release : this.options.release;

				this.config.set('name', this.options.name);
				this.config.set('preprocessor', this.options.pre);
				this.config.set('jscompiler', this.options.js);
				this.config.set('viewExtension', this.options.viewExt);
				this.config.set('clientTemplates', this.options.clientTpl);
				this.config.set('exampleCode', this.options.exampleCode);
				this.config.set('exporter', this.options.exporter);
				this.config.set('release', this.options.release);

				this.config.save();
			});
		}
	}

	get configuring() {
		return {
			download() {
				const done = this.async();

				this.log(`Download ${chalk.cyan(this.srcZip)}`);

				const dl = request
					.get(this.srcZip)
					.on('error', (err) => {
						this.log(chalk.red(err));
					})
					.pipe(fs.createWriteStream(this.destZip));

				dl.on('finish', () => {
					done();
				});
			},
			extract() {
				const done = this.async();
				const zip = new Admzip(this.destZip);

				this.log('Extracting frontend-defaults templates');

				try {
					// extract entries
					zip.extractEntryTo('frontend-defaults-master/codequality/accessibility/.accessibilityrc', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/codequality/eslint/.eslintrc.js', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/codequality/eslint/nitro.eslintignore', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/codequality/htmllint/.htmllintrc', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/codequality/stylelint/.stylelintrc', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/codequality/stylelint/nitro.stylelintignore', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/editorconfig/.editorconfig', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/repo/gitignore/nitro.gitignore', this.sourceRoot(), false, true);
					zip.extractEntryTo('frontend-defaults-master/repo/gitattributes/.gitattributes', this.sourceRoot(), false, true);

					// rename files
					fs.renameSync(this.templatePath('nitro.eslintignore'), this.templatePath('.eslintignore'));
					fs.renameSync(this.templatePath('nitro.gitignore'), this.templatePath('.gitignore'));
					fs.renameSync(this.templatePath('nitro.stylelintignore'), this.templatePath('.stylelintignore'));
				} catch (e) {
					this.log(chalk.red(e.message));
				}

				// remove zip
				fs.unlinkSync(this.destZip);
				done();
			},
		};
	}

	writing() {

		this.log('Scaffolding your app');

		const files = glob.sync('**/*', { cwd: this.sourceRoot(), nodir: true, dot: true });

		const tplFiles = [
			// files to process with copyTpl
			'app/core/config.js',
			'app/tests/jasmine/templating/patternSpec.js',
			'config/default.js',
			'config/default/assets.js',
			'gulp/compile-css.js',
			'gulp/compile-css-proto.js',
			'gulp/compile-js.js',
			'gulp/utils.js',
			'gulp/watch-assets.js',
			'project/.githooks/pre-commit',
			'project/docs/nitro.md',
			'src/patterns/molecules/example/example.html',
			'src/patterns/molecules/example/schema.json',
			'src/proto/js/prototype.js',
			'src/views/index.html',
			'src/views/_partials/head.html',
			'src/views/_partials/foot.html',
			'tests/backstop/backstop.config.js',
			'gulpfile.js',
			'package.json',
		];
		const ignores = [
			// files to ignore
			'.DS_Store',
			'.npmignore',
			'frontend-defaults.zip',
		];
		const ignoresOnUpdate = [
			// files to ignore ono updating projects
			'config/local.js',
		];
		const typeScriptFiles = [
			// files only for this.options.js==='TypeScript'
			'tsd.json',
			'gulp/compile-ts.js',
		];
		const clientTplFiles = [
			// files only for this.options.clientTpl===true
			'src/patterns/molecules/example/_data/example-template.json',
			'src/patterns/molecules/example/js/decorator/example-template.js',
			'src/patterns/molecules/example/template/example.hbs',
			'src/patterns/molecules/example/template/example.links.hbs',
			'src/patterns/molecules/example/template/partial/example.link.hbs',
			'project/docs/client-templates.md',
			'project/blueprints/pattern/template/pattern.hbs',
			'gulp/clean-templates.js',
			'gulp/compile-templates.js',
		];
		const viewFiles = [
			// files that might change file extension
			'src/views/404.html',
			'src/views/index.html',
			'src/views/_layouts/default.html',
			'src/views/_partials/foot.html',
			'src/views/_partials/head.html',
			'src/patterns/atoms/icon/icon.html',
			'src/patterns/molecules/example/example.html',
			'project/blueprints/pattern/pattern.html',
		];
		const examplePaths = [
			// paths only for this.options.exampleCode===true
			'src/patterns/atoms/icon/',
			'src/patterns/molecules/example/',
			'src/assets/css/example/',
			'src/assets/img/icon/',
			'project/routes/',
		];
		const exampleIncludeAnyway = [
			// example file "parts" included for this.options.exampleCode===false
			'project/routes/readme.md',
			'.gitkeep',
		];
		const exporterFiles = [
			// files for this.options.exporter===true
			'config/default/exporter.js',
		];
		const releaseFiles = [
			// files for this.options.release===true
			'config/default/release.js',
		];

		const templateData = {
			name: this.options.name,
			version: this._pkg.version,
			options: this.options,
		};

		files.forEach((file) => {

			// exclude ignores
			if (_.indexOf(ignores, file) !== -1) {
				return;
			}

			// exclude update ignores
			if (this._update) {
				if (_.indexOf(ignoresOnUpdate, file) !== -1) {
					return;
				}
			}

			// TypeScript only Files
			if (this.options.js !== 'TypeScript') {
				if (_.indexOf(typeScriptFiles, file) !== -1) {
					return;
				}
			}

			// Client side templates only Files
			if (!this.options.clientTpl) {
				if (_.indexOf(clientTplFiles, file) !== -1) {
					return;
				}
			}

			// Example only Files
			if (!this.options.exampleCode) {
				if (
					examplePaths.some((v) => file.indexOf(v) >= 0) &&
					exampleIncludeAnyway.every((v) => { return file.indexOf(v) === -1; })
				) {
					return;
				}
			}

			// Exporter only Files
			if (!this.options.exporter) {
				if (_.indexOf(exporterFiles, file) !== -1) {
					return;
				}
			}

			// Release only Files
			if (!this.options.release) {
				if (_.indexOf(releaseFiles, file) !== -1) {
					return;
				}
			}

			const ext = path.extname(file).substring(1);

			// exclude unnecessary preprocessor files
			if (_.indexOf(this._preOptions, ext) !== -1 && this.options.pre !== ext) {
				return;
			}

			if ((_.startsWith(file, 'project') || _.startsWith(file, 'src/patterns')) && (ext === 'js' || ext === 'ts') && (this.options.js === 'JavaScript' && ext !== 'js' || this.options.js === 'TypeScript' && ext !== 'ts')) {
				return;
			}

			const sourcePath = this.templatePath(file);
			let destinationPath = this.destinationPath(file);

			// adjust destination template file extension for view files
			if (_.indexOf(this._viewExtOptions, ext) !== -1 && _.indexOf(viewFiles, file) !== -1) {
				const targetExt = `.${this.options.viewExt !== 0 ? this.options.viewExt : this._viewExtOptions[0]}`;

				destinationPath = destinationPath.replace(path.extname(destinationPath), targetExt);
			}

			if (_.indexOf(tplFiles, file) !== -1) {
				this.fs.copyTpl(sourcePath, destinationPath, templateData);
				return;
			}

			this.fs.copy(sourcePath, destinationPath);
		}, this);
	}

	install() {
		this.installDependencies({
			npm: false,
			bower: false,
			yarn: true,
			skipInstall: this.options.skipInstall,
		});

		if (this.options.js === 'TypeScript') {
			this.spawnCommand('tsd', ['reinstall']).on('close', () => {
				this.spawnCommand('tsd', ['rebundle']);
			});
		}
	}

	end() {
		const filesToCopy = [
			{
				do: this.options.exporter,
				src: 'node_modules/nitro-exporter/README.md',
				srcWeb: 'https://raw.githubusercontent.com/namics/nitro-exporter/master/README.md',
				dest: 'project/docs/nitro-exporter.md',
			},
			{
				do: this.options.release,
				src: 'node_modules/nitro-release/README.md',
				srcWeb: 'https://raw.githubusercontent.com/namics/nitro-release/master/README.md',
				dest: 'project/docs/nitro-release.md',
			},
		];
		try {
			filesToCopy.forEach((file) => {
				if (file.do) {
					if (!this.options.skipInstall) {
						// get readme from current package version
						this.fs.copy(this.destinationPath(file.src), this.destinationPath(file.dest));
					} else {
						// get readme from github master branch
						request
							.get(file.srcWeb)
							.pipe(fs.createWriteStream(this.destinationPath(file.dest)));
					}
				}
			});
		} catch (e) {
			this.log(chalk.red(e.message));
		}

		this.log(chalk.green('All done – have fun'));
	}
};
