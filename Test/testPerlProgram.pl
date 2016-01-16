# Declaro las variables.
my $nombre, $apellido;

$nombre = 'Lucía';
$apellido = 'Pereyra';

#sub a ejecutar
sub renombrar{
    my ($nombre,$apellido) = @_;

    $nombre = 'Gabriela';
    $apellido = 'Piangelua';
   
}

#ejecutando sub
renombrar($nombre, $apellido);
