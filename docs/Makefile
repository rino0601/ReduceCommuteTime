# Minimal makefile for Sphinx documentation
# todo make 4 space into 1 tab.

# You can set these variables from the command line.
PY_VERSION = 3.6
PYTHON = python$(PY_VERSION)
VENV_DIR = .venv

SPHINXOPTS    =
SPHINXBUILD   = $(VENV_DIR)/bin/sphinx-build
SOURCEDIR     = .
BUILDDIR      = .

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: update Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: clean
clean:
    rm -rf $(VENV_DIR)

$(VENV_DIR)/DONE:
    $(PYTHON) -m venv $(VENV_DIR)
    $(VENV_DIR)/bin/pip install sphinx
    $(VENV_DIR)/bin/pip install sphinx_rtd_theme

    touch $(VENV_DIR)/DONE

update: $(VENV_DIR)/DONE Makefile
    echo todo pip install --upgrade --no-dps --force-reinstall PKG