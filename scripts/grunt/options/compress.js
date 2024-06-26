module.exports = function(config) {
  'use strict';

  var task = {
    release: {
      options: {
        archive:
          '<%= destDir %>/<%= pkg.name %><%= enterprise ? "-enterprise" : ""  %>-<%= pkg.version %>.<%= platform %>-<%= arch %><%= libc ? "-" + libc : "" %>.tar.gz',
      },
      files: [
        {
          expand: true,
          cwd: '<%= tempDir %>',
          src: ['**/*'],
          dest: '<%= pkg.name %>-<%= pkg.version %>/',
        },
        {
          expand: true,
          src: ['LICENSE', 'README.md', 'NOTICE.md'],
          dest: '<%= pkg.name %>-<%= pkg.version %>/',
        },
      ],
    },
  };

  if (config.platform === 'windows') {
    task.release.options.archive =
      '<%= destDir %>/<%= pkg.name %><%= enterprise ? "-enterprise" : ""  %>-<%= pkg.version %>.<%= platform %>-<%= arch %>.zip';
  }

  return task;
};
